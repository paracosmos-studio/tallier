import type { InvoiceData } from "$lib/types";
import { contactValues, docShell, escAddr, htmlEscape, itemsTable } from "./shared";

const CSS = `:root { --ink: #1e1e1e; --muted: #787878; --line: #bebebe; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; }
.head { display: flex; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
.head .meta { text-align: right; }
.head h1 { margin: 0; font-size: 1.7rem; font-weight: 600; letter-spacing: 0.02em; }
.head .meta p { margin: 0.1rem 0; }
.from .logo { height: 40px; width: auto; margin-bottom: 0.4rem; }
.billto { margin: 1.6rem 0 1.2rem; }
.billto address { margin-top: 0.2rem; }
th, td { padding: 0.5rem; text-align: left; border: 1px solid var(--line); }
thead th, tfoot th, tfoot td { font-weight: 600; }
.notes { margin-top: 1.2rem; color: var(--muted); }`;

/**
 * Classic HTML invoice: formal two-column header and a fully ruled table.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function classicHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items, totals } = data;
  const e = htmlEscape;
  const contacts = [...contactValues(sender.emails), ...contactValues(sender.phones)];
  const body = `<main class="invoice">
<header class="head">
<address class="from">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<strong>${e(sender.business_name)}</strong>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${contacts.map((c) => `<span>${e(c)}</span>`).join("")}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
<div class="meta">
<h1>INVOICE</h1>
<p>#${e(meta.invoiceNo)}</p>
<p>Issued: ${e(meta.issueDate)}</p>
${meta.dueDate ? `<p>Due: ${e(meta.dueDate)}</p>` : ""}
</div>
</header>
<section class="billto">
<strong>Bill to</strong>
<address>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
</address>
</section>
${itemsTable(items, totals)}
${meta.notes ? `<footer class="notes">${escAddr(meta.notes)}</footer>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
