import type { ClientContact, InvoiceData } from "$lib/types";

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes a string for safe interpolation into HTML text or attributes.
 *
 * @param value - Raw text.
 */
export function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => htmlEscapes[c]);
}

/**
 * Escapes a possibly multi-line address, mapping newlines to line breaks.
 *
 * @param value - Address text, or null when unset.
 */
export function escAddr(value: string | null): string {
  return value ? htmlEscape(value).replace(/\n/g, "<br>") : "";
}

/**
 * Extracts the display values from a contact list.
 *
 * @param items - Labelled contacts, or null when unset.
 */
export function contactValues(items: ClientContact[] | null): string[] {
  return items ? items.map((c) => c.value) : [];
}

/**
 * Renders the line-items grid as a semantic table. Header cells are column
 * scopes, the first totals cell is a row scope, and cells stay pre-formatted.
 * A `colgroup` carries the fr weights as percentages so the fixed-layout table
 * fills its container in the same proportions as the editor and PDF.
 *
 * @param items - Columns, fr widths and data rows of the invoice model.
 * @param totals - Trailing totals rows, cells parallel to the columns.
 */
export function itemsTable(items: InvoiceData["items"], totals: string[][]): string {
  const sum = items.widths.reduce((s, w) => s + w, 0) || items.columns.length;
  const group = items.widths
    .map((w) => `<col style="width:${((w / sum) * 100).toFixed(3)}%">`)
    .join("");
  const head = items.columns.map((c) => `<th scope="col">${htmlEscape(c)}</th>`).join("");
  const body = items.rows
    .map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join("")}</tr>`)
    .join("");
  const foot = totals
    .map(
      (r) =>
        `<tr>${r
          .map((c, i) =>
            i === 0 ? `<th scope="row">${htmlEscape(c)}</th>` : `<td>${htmlEscape(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table><colgroup>${group}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ""}</table>`;
}

const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; -webkit-font-smoothing: antialiased; }
.invoice { max-width: 48rem; margin: 2.5rem auto; padding: 0 1.75rem; }
address { font-style: normal; display: flex; flex-direction: column; gap: 0.1rem; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { overflow-wrap: break-word; vertical-align: top; }`;

/**
 * Wraps template-specific markup and CSS in a standalone HTML document. Shared
 * reset and layout rules are prepended to the template's own styles.
 *
 * @param title - Document title.
 * @param css - Template-specific stylesheet body.
 * @param body - Template-specific markup (the `.invoice` root).
 */
export function docShell(title: string, css: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(title)}</title>
<style>
${BASE_CSS}
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}
