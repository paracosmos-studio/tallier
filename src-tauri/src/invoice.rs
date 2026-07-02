use std::collections::HashMap;

use tauri::AppHandle;
use typst::diag::{FileError, FileResult, SourceDiagnostic, Warned};
use typst::foundations::{Bytes, Datetime, Dict, Value};
use typst::layout::{Abs, PagedDocument};
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};
use typst_pdf::PdfOptions;

use crate::files::{avatars_dir, is_safe_name};

const MAIN: &str = "/main.typ";

// every bundled face, parsed once per compile (cheap; the engine memoizes layout)
macro_rules! fonts {
    ($($p:literal),* $(,)?) => {
        [$(include_bytes!($p).as_slice()),*]
            .into_iter()
            .flat_map(|d| Font::iter(Bytes::new(d.to_vec())))
            .collect::<Vec<_>>()
    };
}

fn load_fonts() -> Vec<Font> {
    fonts![
        "../fonts/instrument-sans/instrument-sans_regular.ttf",
        "../fonts/instrument-sans/instrument-sans_italic.ttf",
        "../fonts/instrument-sans/instrument-sans_medium.ttf",
        "../fonts/instrument-sans/instrument-sans_medium-italic.ttf",
        "../fonts/instrument-sans/instrument-sans_semi-bold.ttf",
        "../fonts/instrument-sans/instrument-sans_semi-bold-italic.ttf",
        "../fonts/instrument-sans/instrument-sans_bold.ttf",
        "../fonts/instrument-sans/instrument-sans_bold-italic.ttf",
        "../fonts/dm-mono/dm-mono_light.ttf",
        "../fonts/dm-mono/dm-mono_light-italic.ttf",
        "../fonts/dm-mono/dm-mono_regular.ttf",
        "../fonts/dm-mono/dm-mono_italic.ttf",
        "../fonts/dm-mono/dm-mono_medium.ttf",
        "../fonts/dm-mono/dm-mono_medium-italic.ttf",
        "../fonts/noto-sans/noto-sans_regular.ttf",
        "../fonts/noto-sans/noto-sans_bold.ttf",
        "../fonts/noto-sans/noto-sans-thai_regular.ttf",
        "../fonts/noto-sans/noto-sans-bengali_regular.ttf",
        "../fonts/noto-sans/noto-sans-khmer_regular.ttf",
        "../fonts/noto-sans/noto-sans-arabic_regular.ttf",
        "../fonts/noto-sans/noto-sans-armenian_regular.ttf",
    ]
}

fn template_src(id: &str) -> Result<&'static str, String> {
    match id {
        "default" => Ok(include_str!("../templates/default.typ")),
        "classic" => Ok(include_str!("../templates/classic.typ")),
        "modern" => Ok(include_str!("../templates/modern.typ")),
        "minimal" => Ok(include_str!("../templates/minimal.typ")),
        _ => Err(format!("unknown template: {id}")),
    }
}

// in-memory typst world: one template source, bundled fonts, virtual logo assets
struct InvoiceWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    main: Source,
    assets: HashMap<FileId, Bytes>,
}

impl World for InvoiceWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.main.id() {
            Ok(self.main.clone())
        } else {
            Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        self.assets
            .get(&id)
            .cloned()
            .ok_or_else(|| FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    // deterministic: documents never embed a wall-clock; dates come from meta
    fn today(&self, _: Option<i64>) -> Option<Datetime> {
        None
    }
}

fn stringify_diagnostics(diags: &[SourceDiagnostic]) -> String {
    diags
        .iter()
        .map(|d| d.message.to_string())
        .collect::<Vec<_>>()
        .join("; ")
}

// shared typeset: template id + payload + resolved logo bytes -> paged document.
// `logos` pair a virtual path ("/sender-logo") with its image bytes; each is
// registered as a typst file and flagged in `sys.inputs` so templates can guard.
fn compile(
    template_id: &str,
    json: &str,
    logos: Vec<(&'static str, Vec<u8>)>,
) -> Result<PagedDocument, String> {
    let fonts = load_fonts();
    let book = FontBook::from_fonts(&fonts);

    let mut inputs = Dict::new();
    inputs.insert("invoice".into(), Value::Bytes(Bytes::new(json.as_bytes().to_vec())));

    let mut assets = HashMap::new();
    for (name, bytes) in logos {
        let id = FileId::new(None, VirtualPath::new(name));
        assets.insert(id, Bytes::new(bytes));
        inputs.insert(name.into(), Value::Bool(true));
    }

    let library = Library::builder().with_inputs(inputs).build();
    let main = Source::new(
        FileId::new(None, VirtualPath::new(MAIN)),
        template_src(template_id)?.to_string(),
    );

    let world = InvoiceWorld {
        library: LazyHash::new(library),
        book: LazyHash::new(book),
        fonts,
        main,
        assets,
    };

    let Warned { output, .. } = typst::compile::<PagedDocument>(&world);
    output.map_err(|d| stringify_diagnostics(&d))
}

// load avatar files from the app-data dir into virtual typst paths; missing or
// blank names are skipped so templates render without them
fn resolve_logos(
    app: &AppHandle,
    sender_logo: Option<String>,
    recipient_avatar: Option<String>,
) -> Result<Vec<(&'static str, Vec<u8>)>, String> {
    let dir = avatars_dir(app)?;
    let mut out = Vec::new();
    for (vpath, name) in [
        ("/sender-logo", sender_logo),
        ("/recipient-avatar", recipient_avatar),
    ] {
        let Some(name) = name.filter(|n| !n.trim().is_empty()) else {
            continue;
        };
        if !is_safe_name(&name) {
            return Err("invalid avatar name".to_string());
        }
        if let Ok(bytes) = std::fs::read(dir.join(&name)) {
            out.push((vpath, bytes));
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn render_invoice_pdf(
    app: AppHandle,
    template_id: String,
    data: String,
    sender_logo: Option<String>,
    recipient_avatar: Option<String>,
) -> Result<Vec<u8>, String> {
    let logos = resolve_logos(&app, sender_logo, recipient_avatar)?;
    let doc = compile(&template_id, &data, logos)?;
    typst_pdf::pdf(&doc, &PdfOptions::default()).map_err(|d| stringify_diagnostics(&d))
}

#[tauri::command]
pub fn render_invoice_svg(
    app: AppHandle,
    template_id: String,
    data: String,
    sender_logo: Option<String>,
    recipient_avatar: Option<String>,
) -> Result<String, String> {
    let logos = resolve_logos(&app, sender_logo, recipient_avatar)?;
    let doc = compile(&template_id, &data, logos)?;
    Ok(typst_svg::svg_merged(&doc, Abs::zero()))
}

#[cfg(test)]
mod tests {
    use super::*;

    // mirrors a real `toInvoiceInput` payload: optional fields null/blank,
    // a company-only recipient (contact_name is nullable), contact lists
    // present and absent, a multi-line address, totals row, a non-latin
    // currency symbol (exercises the noto fallback fonts)
    const SAMPLE: &str = r#"{
        "sender": {
            "id": 1, "position": 0, "label": "Main",
            "business_name": "Acme Studio", "tax_id": null,
            "emails": [{"label": "Email", "value": "hi@acme.test"}],
            "phones": null, "mailing_address": "12 Market St\nSpringfield"
        },
        "recipient": {
            "id": 2, "position": 0, "contact_name": null,
            "company_name": "BobCo LLC", "mailing_address": "9 River Rd",
            "emails": null, "phones": [{"label": "Mobile", "value": "+1 555 0100"}],
            "websites": null, "invoice_id_prefix": null
        },
        "meta": {
            "invoiceNo": "INV-1024", "issueDate": "Jun 14, 2026",
            "dueDate": "", "notes": "Thank you for your business."
        },
        "items": {
            "columns": ["Date", "Project", "Hours", "Rate", "Total"],
            "widths": [1.4, 1.4, 1, 1, 1],
            "rows": [
                ["Jun 1", "Website", "2.00", "₹100.00", "₹200.00"],
                ["Jun 2", "Website", "1.50", "₹100.00", "₹150.00"]
            ]
        },
        "totals": [["Total", "", "3.50", "", "₹350.00"]]
    }"#;

    #[test]
    fn every_template_renders() {
        for id in ["default", "classic", "modern", "minimal"] {
            let doc = compile(id, SAMPLE, Vec::new()).unwrap_or_else(|e| panic!("{id}: {e}"));
            let pdf = typst_pdf::pdf(&doc, &PdfOptions::default()).expect("pdf bytes");
            assert!(!pdf.is_empty(), "{id}: empty pdf");
            assert!(typst_svg::svg_merged(&doc, Abs::zero()).contains("<svg"), "{id}: no svg");
        }
    }

    #[test]
    fn unknown_template_errors() {
        assert!(compile("nope", SAMPLE, Vec::new()).is_err());
    }

    // exercises the virtual-file logo path and each template's logo guard
    #[test]
    fn renders_with_logo() {
        // a 1x1 white png
        const PNG: &[u8] = &[
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
            0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
            0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0b, 0x49, 0x44, 0x41, 0x54, 0x78,
            0x9c, 0x63, 0xf8, 0x0f, 0x04, 0x00, 0x09, 0xfb, 0x03, 0xfd, 0xfb, 0x5e, 0x6b, 0x2b,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
        ];
        for id in ["default", "classic", "modern", "minimal"] {
            let doc = compile(id, SAMPLE, vec![("/sender-logo", PNG.to_vec())])
                .unwrap_or_else(|e| panic!("{id} with logo: {e}"));
            assert!(!typst_pdf::pdf(&doc, &PdfOptions::default()).expect("pdf").is_empty());
        }
    }
}
