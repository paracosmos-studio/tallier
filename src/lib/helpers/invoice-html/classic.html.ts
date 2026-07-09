import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { balanceValue, contactValues, docShell, escAddr, htmlEscape, itemsTable } from "./shared";

const CSS = `:root { --ink: #1a1a1a; --navy: #1b2a4a; --hair: #d0d0d0; --muted: #4a4a4a; --serif: Georgia, "Times New Roman", Times, serif; }
.invoice { color: var(--ink); font-family: var(--serif); font-size: 0.95rem; line-height: 1.55; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 2.5rem; }
.head .name { font-size: 1.45rem; font-variant: small-caps; letter-spacing: 0.06em; color: var(--navy); }
.head .from address { margin-top: 0.5rem; font-size: 0.82rem; color: var(--muted); }
.head .title { text-align: right; min-width: 11rem; }
.head .title h1 { margin: 0; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; color: var(--navy); }
.head .title .rule { border: 0; border-top: 1px solid var(--ink); margin: 0.45rem 0 0.5rem; }
.head .title p { margin: 0; }
.billto { margin: 1.9rem 0 1.5rem; }
.billto h2 { margin: 0 0 0.3rem; font-size: 0.85rem; font-variant: small-caps; letter-spacing: 0.08em; color: var(--navy); }
.summary { border-top: 0.5px solid var(--ink); border-bottom: 0.5px solid var(--ink); margin: 0 0 2.2rem; padding: 0.75rem 0; display: grid; grid-template-columns: auto 1fr; gap: 0.45rem 1.4rem; }
.summary dt { margin: 0; font-weight: 700; }
.summary dd { margin: 0; }
.invoice th, .invoice td { padding: 0.55rem 0.6rem; text-align: left; }
.invoice tbody td, .invoice tbody th { border-bottom: 1px solid var(--hair); }
.invoice tbody tr.section > * { font-weight: 700; color: var(--navy); }
.invoice .num { text-align: right; }
.notes { margin-top: 1.8rem; text-align: center; font-style: italic; color: var(--muted); }`;

/**
 * Classic HTML invoice: formal serif letter with small-caps headings, a
 * single-ruled title, a hairline-ruled summary strip and a ruled items table
 * with navy bold header bands. Mirrors the classic PDF.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, unused by this design.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function classicHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
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
  const body = `<main class="invoice">
<header class="head">
<div class="from">
<span class="name">${e(sender.business_name)}</span>
<address>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${senderContacts.map((c) => `<span>${e(c)}</span>`).join("")}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
</div>
<div class="title">
<h1>Invoice</h1>
<hr class="rule">
<p>#${e(meta.invoiceNo)}</p>
</div>
</header>
<section class="billto">
<h2>Bill To</h2>
<address>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${recipContacts.map((c) => `<span>${e(c)}</span>`).join("")}
</address>
</section>
<dl class="summary">
<dt>Issue date</dt><dd>${e(meta.issueDate)}</dd>
${meta.dueDate ? `<dt>Due date</dt><dd>${e(meta.dueDate)}</dd>` : ""}
<dt>Balance</dt><dd>${e(balance)}</dd>
</dl>
${itemsTable(items)}
${meta.notes ? `<footer class="notes">${escAddr(meta.notes)}</footer>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
