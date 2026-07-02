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
 * Maps fr column weights to a `colgroup` of percentage widths so fixed-layout
 * tables keep the editor's proportions.
 *
 * @param widths - fr weights, one per column.
 * @param count - Column count, the fallback weight sum when widths are zero.
 */
export function colGroup(widths: number[], count: number): string {
  const sum = widths.reduce((s, w) => s + w, 0) || count;
  const cols = widths.map((w) => `<col style="width:${((w / sum) * 100).toFixed(3)}%">`).join("");
  return `<colgroup>${cols}</colgroup>`;
}

/**
 * Column span of a header row's leading cell: it absorbs the run of empty
 * cells directly to its right, so later values stay in their own columns.
 *
 * @param cells - Header row cells, parallel to the columns.
 */
export function headerSpan(cells: string[]): number {
  const gap = cells.slice(1).findIndex((c) => c !== "");
  return gap === -1 ? cells.length : gap + 1;
}

/**
 * Renders the line-items grid as a semantic table. Header cells are column
 * scopes and cells stay pre-formatted. Body rows keep their editor order:
 * `header`-kind rows (sub-sections, totals) render in place as `tr.section`
 * whose row-scoped first cell spans the empty cells directly to its right.
 * A `colgroup` carries the fr weights as percentages so the fixed-layout
 * table fills its container in the same proportions as the editor and PDF.
 *
 * @param items - Columns, fr widths and ordered body rows of the invoice model.
 */
export function itemsTable(items: InvoiceData["items"]): string {
  const group = colGroup(items.widths, items.columns.length);
  const colSpan = headerSpan(items.columns);
  const head =
    `<th scope="${colSpan > 1 ? "colgroup" : "col"}" colspan="${colSpan}">${htmlEscape(items.columns[0] ?? "")}</th>` +
    items.columns
      .slice(colSpan)
      .map((c) => `<th scope="col">${htmlEscape(c)}</th>`)
      .join("");
  const body = items.rows
    .map((r) => {
      if (r.kind === "header") {
        const span = headerSpan(r.cells);
        const rest = r.cells
          .slice(span)
          .map((c) => `<td>${htmlEscape(c)}</td>`)
          .join("");
        return `<tr class="section"><th scope="row" colspan="${span}">${htmlEscape(r.cells[0] ?? "")}</th>${rest}</tr>`;
      }
      return `<tr>${r.cells.map((c) => `<td>${htmlEscape(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  return `<table>${group}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
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
