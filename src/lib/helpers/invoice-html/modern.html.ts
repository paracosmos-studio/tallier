import type { InvoiceData } from "$lib/types";
import { contactValues, docShell, escAddr, htmlEscape, itemsTable } from "./shared";

const CSS = `:root { --ink: #232323; --muted: #787878; --accent: #2f6f4f; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; }
.band { display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; padding: 1.1rem 1.25rem; border-radius: 6px; background: var(--accent); color: #fff; }
.band .ident { display: flex; align-items: center; gap: 0.6rem; }
.band .logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex: none; }
.band .name { font-size: 1.15rem; font-weight: 600; }
.band h1 { margin: 0; font-size: 1.8rem; font-weight: 700; }
.band .no { text-align: right; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1.4rem 0; }
.parties .from { text-align: right; }
.lbl { color: var(--accent); font-weight: 600; letter-spacing: 0.04em; }
th, td { padding: 0.55rem 0.4rem; text-align: left; }
thead th { color: var(--accent); font-weight: 600; border-bottom: 1px solid var(--accent); }
tbody { border-bottom: 1px solid var(--accent); }
tfoot th, tfoot td { font-weight: 600; }
.notes { margin-top: 1.4rem; color: var(--muted); }`;

/**
 * Modern HTML invoice: accent band header, two-party split, accent-ruled table.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function modernHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items, totals } = data;
  const e = htmlEscape;
  const emails = contactValues(sender.emails);
  const body = `<main class="invoice">
<header class="band">
<div class="ident">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<span class="name">${e(sender.business_name)}</span>
</div>
<div class="no">
<h1>INVOICE</h1>
<span>#${e(meta.invoiceNo)}</span>
</div>
</header>
<div class="parties">
<address class="to">
<span class="lbl">BILL TO</span>
<span>${e(recipient.contact_name)}</span>
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
</address>
<address class="from">
<span class="lbl">FROM</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${emails.map((c) => `<span>${e(c)}</span>`).join("")}
<span>Issued: ${e(meta.issueDate)}</span>
${meta.dueDate ? `<span>Due: ${e(meta.dueDate)}</span>` : ""}
</address>
</div>
${itemsTable(items, totals)}
${meta.notes ? `<footer class="notes">${escAddr(meta.notes)}</footer>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
