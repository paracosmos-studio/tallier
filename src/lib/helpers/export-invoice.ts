import { invoke } from "@tauri-apps/api/core";
import { csvEscape } from "./csv";
import { joinPath } from "./fs";
import { toInvoiceInput } from "./invoice-data";
import type { InvoiceData } from "$lib/types";

export type InvoiceFormat = "pdf" | "html" | "csv" | "txt";

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => htmlEscapes[c]);
}

// filesystem-safe invoice number for use in a filename
function safeNo(no: string): string {
  return no.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "invoice";
}

/**
 * Builds the absolute target path an export writes to, without touching disk.
 *
 * @param location - Destination directory.
 * @param data - Assembled invoice model (its number names the file).
 * @param format - Output format, used as the extension.
 */
export function invoiceTargetPath(location: string, data: InvoiceData, format: InvoiceFormat): string {
  return joinPath(location, `invoice_${safeNo(data.meta.invoiceNo)}.${format}`);
}

/**
 * Renders the items table (columns, rows, totals) as CSV.
 *
 * @param data - Assembled invoice model.
 */
export function toCsv(data: InvoiceData): string {
  const rows = [data.items.columns, ...data.items.rows, ...data.totals];
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

// pad each column to its widest cell so text output stays aligned
function textTable(rows: string[][]): string[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, cell.length)));
  }
  return rows.map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd());
}

/**
 * Renders the invoice as a readable plain-text document.
 *
 * @param data - Assembled invoice model.
 */
export function toPlainText(data: InvoiceData): string {
  const { sender, recipient, meta, items, totals } = data;
  const out: string[] = [`INVOICE ${meta.invoiceNo}`, `Issued: ${meta.issueDate}`];
  if (meta.dueDate) out.push(`Due: ${meta.dueDate}`);
  out.push("", `From: ${sender.business_name}`);
  if (sender.mailing_address) out.push(sender.mailing_address);
  out.push("", `Bill to: ${recipient.contact_name}`);
  if (recipient.company_name) out.push(recipient.company_name);
  if (recipient.mailing_address) out.push(recipient.mailing_address);
  out.push("", ...textTable([items.columns, ...items.rows, ...totals]));
  if (meta.notes) out.push("", meta.notes);
  return out.join("\n") + "\n";
}

/**
 * Renders the invoice as a standalone, neutral HTML document. Layout is
 * data-driven and identical regardless of the selected PDF template.
 *
 * @param data - Assembled invoice model.
 */
export function toHtml(data: InvoiceData): string {
  const e = htmlEscape;
  const { sender, recipient, meta, items, totals } = data;
  const head = `<tr>${items.columns.map((c) => `<th scope="col">${e(c)}</th>`).join("")}</tr>`;
  const body = items.rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("");
  const foot = totals.map((r) => `<tr>${r.map((c) => `<th scope="row">${e(c)}</th>`).join("")}</tr>`).join("");
  const addr = (v: string | null) => (v ? `<p>${e(v).replace(/\n/g, "<br>")}</p>` : "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${e(meta.invoiceNo)}</title>
<style>
:root { --ink: #1c1c1c; --muted: #6b6b6b; --line: #e0e0e0; }
body { font-family: system-ui, sans-serif; color: var(--ink); max-width: 48rem; margin: 2rem auto; padding: 0 1.5rem; }
header { display: flex; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
h1 { font-size: 1.6rem; margin: 0; }
address { font-style: normal; }
p { margin: 0.15rem 0; }
.muted { color: var(--muted); }
table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--line); }
tfoot th { border-bottom: none; }
</style>
</head>
<body>
<header>
<address>
<strong>${e(sender.business_name)}</strong>
${addr(sender.mailing_address)}
</address>
<div>
<h1>Invoice</h1>
<p>#${e(meta.invoiceNo)}</p>
<p class="muted">Issued: ${e(meta.issueDate)}${meta.dueDate ? ` &middot; Due: ${e(meta.dueDate)}` : ""}</p>
</div>
</header>
<section>
<p class="muted">Bill to</p>
<address>
<strong>${e(recipient.contact_name)}</strong>
${recipient.company_name ? `<p>${e(recipient.company_name)}</p>` : ""}
${addr(recipient.mailing_address)}
</address>
</section>
<table>
<thead>${head}</thead>
<tbody>${body}</tbody>
<tfoot>${foot}</tfoot>
</table>
${meta.notes ? `<p class="muted">${e(meta.notes).replace(/\n/g, "<br>")}</p>` : ""}
</body>
</html>
`;
}

/**
 * Exports the invoice in the chosen format and returns the resolved path.
 * PDF compiles via the Typst engine then writes bytes; the data formats write
 * text directly. A leading `~/` in `location` is expanded server-side.
 *
 * @param data - Assembled invoice model.
 * @param templateId - Selected PDF template id (used by the PDF path only).
 * @param format - Output format.
 * @param location - Destination directory.
 */
export async function exportInvoice(
  data: InvoiceData,
  templateId: string,
  format: InvoiceFormat,
  location: string,
): Promise<string> {
  const path = invoiceTargetPath(location, data, format);
  if (format === "pdf") {
    const bytes = await invoke<number[]>("render_invoice_pdf", {
      templateId,
      data: toInvoiceInput(data),
      senderLogo: data.sender.logo,
      recipientAvatar: data.recipient.avatar,
    });
    return await invoke<string>("write_file", { path, bytes });
  }
  const contents = format === "csv" ? toCsv(data) : format === "txt" ? toPlainText(data) : toHtml(data);
  return await invoke<string>("write_text_file", { path, contents });
}
