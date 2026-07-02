import type { InvoiceData } from "$lib/types";
import {
  balanceValue,
  contactValues,
  docShell,
  escAddr,
  htmlEscape,
  itemsTable,
  links,
  mailHref,
  telHref,
  webHref,
} from "./shared";

const CSS = `:root { --green: #3e6b34; --tint: rgba(158, 203, 120, 0.3); --pale: #f0f7ea; --ink: #1f2430; --muted: #6b7280; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; }
.invoice a { color: var(--green); text-decoration: none; }
.band { position: relative; overflow: hidden; margin: 0 -1.75rem 2rem; padding: 2.25rem 1.75rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; background: var(--green); color: #fff; }
.band::before { content: ""; position: absolute; top: -120px; right: -60px; width: 260px; height: 260px; border-radius: 50%; background: var(--tint); }
.band .ident { position: relative; display: flex; align-items: center; gap: 0.75rem; }
.band .logo { height: 44px; width: auto; }
.band .name { font-size: 1.35rem; font-weight: 700; }
.band .no { position: relative; text-align: right; }
.band h1 { margin: 0; font-size: 2rem; line-height: 1; font-weight: 700; }
.band .no p { margin: 0.25rem 0 0; font-weight: 500; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 0 0 1.75rem; }
.parties .name { font-size: 1.05rem; font-weight: 600; }
.lbl { font-size: 0.7rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); font-weight: 500; margin-bottom: 0.35rem; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin: 0 0 2rem; }
.summary div { background: var(--pale); border-radius: 8px; padding: 0.6rem 0.75rem; }
.summary .wide { grid-column: span 2; }
.summary dt { font-size: 0.7rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
.summary dd { margin: 0.3rem 0 0; font-weight: 600; }
.summary .balance dd { color: var(--green); }
.items { border-collapse: separate; border-spacing: 0 4px; }
.items th, .items td { padding: 0.55rem 0.65rem; text-align: left; }
.items thead th { color: var(--green); font-weight: 600; }
.items .num { text-align: right; }
.items tr.section th, .items tr.section td { background: var(--pale); color: var(--green); font-weight: 600; }
.items tr.section th { border-radius: 6px 0 0 6px; }
.items tr.section td:last-child { border-radius: 0 6px 6px 0; }`;

/**
 * Modern HTML invoice: full-bleed green header band with a decorative arc,
 * uppercase-labelled party columns, pale-green summary chips and a borderless
 * table whose header rows render as pale-green bands.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function modernHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const balance = balanceValue(items.rows);
  const body = `<main class="invoice">
<header class="band">
<div class="ident">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<span class="name">${e(sender.business_name)}</span>
</div>
<div class="no">
<h1>Invoice</h1>
<p>#${e(meta.invoiceNo)}</p>
</div>
</header>
<div class="parties">
<address class="from">
<span class="lbl">From</span>
<span class="name">${e(sender.business_name)}</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
<address class="to">
<span class="lbl">Bill to</span>
${recipient.contact_name ? `<span class="name">${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span class="name">${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${links(contactValues(recipient.emails), mailHref)}
${links(contactValues(recipient.phones), telHref)}
${links(contactValues(recipient.websites), webHref)}
</address>
</div>
<dl class="summary">
<div><dt>Issue date</dt><dd>${e(meta.issueDate)}</dd></div>
${meta.dueDate ? `<div><dt>Due date</dt><dd>${e(meta.dueDate)}</dd></div>` : ""}
<div${meta.dueDate ? "" : ' class="wide"'}><dt>Notes</dt><dd>${escAddr(meta.notes)}</dd></div>
<div class="balance"><dt>Balance</dt><dd>${e(balance)}</dd></div>
</dl>
${itemsTable(items, "items")}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
