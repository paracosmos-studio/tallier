import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { balanceValue, contactValues, docShell, escAddr, htmlEscape, itemsTable } from "./shared";

const CSS = `:root { --ink: #1a1a1a; --dot: #9a9a9a; --dash: #333; --muted: #787878; --mono: "JetBrains Mono", "DM Mono", ui-monospace, Menlo, Consolas, monospace; }
.invoice { color: var(--ink); font-family: var(--mono); font-size: 0.85rem; line-height: 1.5; padding: 2rem; }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
.head .co { font-size: 1.1rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em; }
.head .no { font-weight: 500; }
.rule { border: 0; border-top: 1px dashed var(--dash); margin: 0.6rem 0 1.1rem; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.parties h2 { margin: 0 0 0.3rem; font-size: 0.85rem; font-weight: 500; }
.summary { margin: 0 0 1.1rem; }
.leader { display: flex; align-items: baseline; gap: 0.5rem; }
.leader + .leader { margin-top: 0.4rem; }
.leader dt { margin: 0; text-transform: uppercase; white-space: nowrap; }
.leader dd { margin: 0; white-space: nowrap; }
.leader .dots { flex: 1; align-self: end; margin-bottom: 0.2em; border-bottom: 1px dotted var(--dot); }
.invoice th, .invoice td { padding: 0.3rem 0.5rem; text-align: left; }
.invoice th:first-child, .invoice td:first-child { padding-left: 0; }
.invoice th:last-child, .invoice td:last-child { padding-right: 0; }
.invoice tbody tr.section > * { font-weight: 500; }
.invoice .num { text-align: right; }
.notes { margin: 1.1rem 0 0; color: var(--muted); }`;

/**
 * Terminal HTML invoice: monospace receipt with uppercase labels, a dashed
 * rule under the masthead, dotted-leader key/value pairs, an edge-flush items
 * table, medium-weight header bands and gray trailing notes. Mirrors the
 * terminal PDF; the logo is skipped.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, deliberately unused.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function terminalHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
  void logo;
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const senderContacts = [...contactValues(sender.emails), ...contactValues(sender.phones)];
  const recipContacts = [
    ...contactValues(recipient.emails),
    ...contactValues(recipient.phones),
    ...contactValues(recipient.websites),
  ];
  const balance = balanceValue(items.rows);
  const leader = (label: string, value: string): string =>
    value
      ? `<div class="leader"><dt>${e(label)}</dt><span class="dots" aria-hidden="true"></span><dd>${e(value)}</dd></div>`
      : "";
  const body = `<main class="invoice">
<header class="head">
<span class="co">${e(sender.business_name)}</span>
<span class="no">#${e(meta.invoiceNo)}</span>
</header>
<hr class="rule">
<div class="parties">
<section>
<h2>From</h2>
<address>
<span>${e(sender.business_name)}</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${senderContacts.map((c) => `<span>${e(c)}</span>`).join("")}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
</section>
<section>
<h2>Bill To</h2>
<address>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${recipContacts.map((c) => `<span>${e(c)}</span>`).join("")}
</address>
</section>
</div>
<dl class="summary">
${leader("Issue date", meta.issueDate)}
${leader("Due date", meta.dueDate)}
${leader("Balance", balance)}
</dl>
${itemsTable(items)}
${meta.notes ? `<p class="notes">${escAddr(meta.notes)}</p>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
