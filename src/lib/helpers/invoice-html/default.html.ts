import type { InvoiceData } from "$lib/types";
import { colGroup, contactValues, docShell, escAddr, headerSpan, htmlEscape } from "./shared";

const CSS = `:root { --ink: #1a1a1a; --fill: #f2f2f2; --blue: #1d4ed8; --red: #991b1b; --green: #15803d; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; }
.invoice a { color: var(--blue); text-decoration: none; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
.head .logo { height: 64px; width: auto; }
.head .no { margin-left: auto; text-align: right; }
.head h1 { margin: 0; padding: 0; font-size: 1.875rem; line-height: 1; font-weight: 700; }
.head .no p { margin: 0.15rem 0 0; font-weight: 600; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1.5rem 0 3rem; }
.parties .name { font-size: 1.05rem; font-weight: 700; }
.billto h2 { margin: 0 0 0.2rem; font-size: 0.95rem; font-weight: 700; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 3px; margin: 0 0 3rem; }
.summary dt { background: var(--fill); font-weight: 500; padding: 0.45rem 0.6rem; }
.summary dd { margin: 0; padding: 0.4rem 0.6rem; }
.summary .wide { grid-column: span 2; }
.summary .balance dd { color: var(--red); }
th, td { padding: 0.5rem 0.6rem; text-align: left; }
thead th { font-weight: 500; background: var(--fill); }
.items tbody td { padding-top: 6px; padding-bottom: 6px; }
.items .section th, .items .section td { background: var(--fill); font-weight: 500; padding: 0.5rem 0.6rem; }
.num { text-align: right; }`;

/**
 * Renders contact values as anchors, one per address line.
 *
 * @param values - Display values.
 * @param href - Maps a value to its link target.
 */
function links(values: string[], href: (v: string) => string): string {
  return values.map((v) => `<a href="${htmlEscape(href(v))}">${htmlEscape(v)}</a>`).join("");
}

const mailHref = (v: string): string => `mailto:${v}`;
const telHref = (v: string): string => `tel:${v.replace(/[^+\d]/g, "")}`;
const webHref = (v: string): string => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

/**
 * Default HTML invoice: borderless letter layout with gray-fill hierarchy,
 * a four-up summary strip and in-place gray section/totals bands.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function defaultHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const numFrom = Math.max(1, items.columns.length - 3);
  const num = (i: number): string => (i >= numFrom ? ' class="num"' : "");
  const colSpan = headerSpan(items.columns);
  const head =
    `<th scope="${colSpan > 1 ? "colgroup" : "col"}" colspan="${colSpan}">${e(items.columns[0] ?? "")}</th>` +
    items.columns
      .slice(colSpan)
      .map((c, j) => `<th scope="col"${num(colSpan + j)}>${e(c)}</th>`)
      .join("");
  const rows = items.rows
    .map((r) => {
      if (r.kind === "header") {
        const span = headerSpan(r.cells);
        const rest = r.cells
          .slice(span)
          .map((c, j) => `<td${num(span + j)}>${e(c)}</td>`)
          .join("");
        return `<tr class="section"><th scope="row" colspan="${span}">${e(r.cells[0] ?? "")}</th>${rest}</tr>`;
      }
      return `<tr>${r.cells.map((c, i) => `<td${num(i)}>${e(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  const lastBand = [...items.rows].reverse().find((r) => r.kind === "header");
  const balance = lastBand ? ([...lastBand.cells].reverse().find((c) => c !== "") ?? "") : "";
  const body = `<main class="invoice">
<header class="head">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<div class="no">
<h1>INVOICE</h1>
<p>#${e(meta.invoiceNo)}</p>
</div>
</header>
<div class="parties">
<address class="from">
<span class="name">${e(sender.business_name)}</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
<section class="billto">
<h2>Bill To</h2>
<address>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${links(contactValues(recipient.emails), mailHref)}
${links(contactValues(recipient.phones), telHref)}
${links(contactValues(recipient.websites), webHref)}
</address>
</section>
</div>
<dl class="summary">
<div><dt>Issue date</dt><dd>${e(meta.issueDate)}</dd></div>
${meta.dueDate ? `<div><dt>Due date</dt><dd>${e(meta.dueDate)}</dd></div>` : ""}
<div${meta.dueDate ? "" : ' class="wide"'}><dt>Notes</dt><dd>${escAddr(meta.notes)}</dd></div>
<div class="balance"><dt>Balance</dt><dd>${e(balance)}</dd></div>
</dl>
<table class="items">
${colGroup(items.widths, items.columns.length)}
<thead><tr>${head}</tr></thead>
<tbody>${rows}</tbody>
</table>
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
