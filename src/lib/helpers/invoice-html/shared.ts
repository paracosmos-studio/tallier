import type { ClientContact, InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";

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

/** Maps an email address to its mailto target. */
export const mailHref = (v: string): string => `mailto:${v}`;

/** Maps a phone number to its tel target, keeping digits and the plus sign. */
export const telHref = (v: string): string => `tel:${v.replace(/[^+\d]/g, "")}`;

/** Maps a website to an absolute https url when the scheme is missing. */
export const webHref = (v: string): string => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

/**
 * Renders contact values as anchors, one per address line.
 *
 * @param values - Display values.
 * @param href - Maps a value to its link target.
 */
export function links(values: string[], href: (v: string) => string): string {
  return values.map((v) => `<a href="${htmlEscape(href(v))}">${htmlEscape(v)}</a>`).join("");
}

/**
 * Balance shown by summary blocks: the trailing non-empty cell of the last
 * header-kind row, or an empty string when no such row exists.
 *
 * @param rows - Ordered body rows of the items model.
 */
export function balanceValue(rows: InvoiceData["items"]["rows"]): string {
  const last = [...rows].reverse().find((r) => r.kind === "header");
  return last ? ([...last.cells].reverse().find((c) => c !== "") ?? "") : "";
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
 * Renders the line-items grid as a semantic table. Cells stay pre-formatted
 * and body rows keep their editor order. Every header row - the column-label
 * row and `header`-kind rows (sub-sections, totals) alike - renders as an
 * identical `tr.section` band whose first cell spans the empty cells directly
 * to its right; no `thead` is emitted so nothing repeats across print pages.
 * Label cells stay `th` column scopes for assistive tech. A `colgroup`
 * carries the fr weights as percentages so the fixed-layout table fills its
 * container in the same proportions as the editor and PDF. Cells of the
 * trailing three columns carry `num` so template css can right-align numeric
 * columns without a local builder.
 *
 * @param items - Columns, fr widths and ordered body rows of the invoice model.
 * @param cls - Optional class for the table element.
 */
export function itemsTable(items: InvoiceData["items"], cls: string = ""): string {
  const group = colGroup(items.widths, items.columns.length);
  const numFrom = Math.max(1, items.columns.length - 3);
  const num = (col: number): string => (col >= numFrom ? ' class="num"' : "");
  const section = (cells: string[], labels: boolean): string => {
    const span = headerSpan(cells);
    const scope = labels ? (span > 1 ? "colgroup" : "col") : "row";
    const cell = (c: string, j: number): string =>
      labels
        ? `<th scope="col"${num(j)}>${htmlEscape(c)}</th>`
        : `<td${num(j)}>${htmlEscape(c)}</td>`;
    const rest = cells
      .slice(span)
      .map((c, j) => cell(c, span + j))
      .join("");
    return `<tr class="section"><th scope="${scope}" colspan="${span}"${num(0)}>${htmlEscape(cells[0] ?? "")}</th>${rest}</tr>`;
  };
  const body = items.rows
    .map((r) =>
      r.kind === "header"
        ? section(r.cells, false)
        : `<tr>${r.cells.map((c, j) => `<td${num(j)}>${htmlEscape(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table${cls ? ` class="${cls}"` : ""}>${group}<tbody>${section(items.columns, true)}${body}</tbody></table>`;
}

const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; -webkit-font-smoothing: antialiased; }
.invoice { max-width: 48rem; margin: 0 auto; padding: 2.25rem; }
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
 * @param stamp - Provenance stamp, emitted as a `generator` meta tag;
 * invisible when rendered, readable on view-source.
 */
export function docShell(title: string, css: string, body: string, stamp?: ExportStamp): string {
  const provenance = stamp
    ? `
<meta name="generator" content="${htmlEscape(stamp)}">`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${provenance}
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
