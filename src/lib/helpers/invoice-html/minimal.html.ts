import type { InvoiceData } from "$lib/types";
import { docShell, escAddr, htmlEscape, itemsTable } from "./shared";

const CSS = `:root { --ink: #141414; --muted: #787878; --line: #d2d2d2; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --mono: "DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.6; }
.lbl { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
.head .ident { display: flex; flex-direction: column; gap: 0.45rem; align-items: flex-start; }
.head .logo { height: 34px; width: auto; }
.head .name { font-family: var(--mono); font-size: 1.05rem; }
.head .no { text-align: right; }
.head .no span { font-family: var(--mono); }
.rule { border: none; border-top: 1px solid var(--line); margin: 0.8rem 0; }
.meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.2rem; }
.meta .due { text-align: right; }
th, td { padding: 0.4rem 0; text-align: left; }
thead th { border-bottom: 1px solid var(--line); }
tbody { border-bottom: 1px solid var(--line); }
tfoot th, tfoot td { font-weight: 600; }
.notes { margin-top: 1.4rem; padding-top: 0.6rem; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }`;

/**
 * Minimal HTML invoice: monospaced labels, hairline rules, terse three-up meta.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function minimalHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items, totals } = data;
  const e = htmlEscape;
  const body = `<main class="invoice">
<header class="head">
<div class="ident">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<span class="name">${e(sender.business_name)}</span>
</div>
<div class="no">
<span class="lbl">Invoice</span>
<span>${e(meta.invoiceNo)}</span>
</div>
</header>
<hr class="rule">
<div class="meta">
<address class="to">
<span class="lbl">Billed to</span>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
</address>
<div class="issued">
<span class="lbl">Issued</span>
<span>${e(meta.issueDate)}</span>
</div>
<div class="due">
${meta.dueDate ? `<span class="lbl">Due</span><span>${e(meta.dueDate)}</span>` : ""}
</div>
</div>
${itemsTable(items, totals)}
${meta.notes ? `<footer class="notes">${escAddr(meta.notes)}</footer>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
