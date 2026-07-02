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

const CSS = `:root { --pblue: #eaf2ff; --mint: #e8f7ee; --peach: #fff1e8; --charcoal: #3a3f47; --coral: #f2876b; --muted: #8a909b; --line: #eceef1; --rounded: Nunito, Quicksand, "Trebuchet MS", sans-serif; }
.invoice { color: var(--charcoal); font-family: var(--rounded); font-size: 0.9rem; line-height: 1.55; }
.invoice a { color: var(--coral); text-decoration: none; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; margin-bottom: 1.75rem; }
.head .ident { display: flex; align-items: center; gap: 0.7rem; }
.head .logo { height: 38px; width: auto; }
.head .name { font-size: 1.4rem; font-weight: 700; }
.head .no { text-align: right; }
.badge { display: inline-block; margin-top: 0.4rem; background: var(--pblue); color: var(--charcoal); font-weight: 700; border-radius: 999px; padding: 0.4rem 0.9rem; }
.lbl { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.card { border-radius: 16px; padding: 0.95rem 1.1rem; }
.card address { margin-top: 0.4rem; }
.card .name { font-weight: 700; }
.blue { background: var(--pblue); }
.mint { background: var(--mint); }
.peach { background: var(--peach); }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin-bottom: 1.75rem; }
.summary div { border-radius: 14px; padding: 0.75rem 0.9rem; }
.summary .wide { grid-column: span 2; }
.summary dt { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.summary dd { margin: 0.3rem 0 0; font-weight: 700; }
.summary .balance dd { color: var(--coral); }
.tablecard { border: 1px solid var(--line); border-radius: 16px; padding: 0.75rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.items { border-collapse: separate; border-spacing: 0 3px; }
.items th, .items td { padding: 0.55rem 0.65rem; text-align: left; }
.items thead th { font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.items .num { text-align: right; }
.items tr.section th, .items tr.section td { background: var(--pblue); font-weight: 700; }
.items tr.section th { border-radius: 8px 0 0 8px; }
.items tr.section td:last-child { border-radius: 0 8px 8px 0; }`;

/**
 * Soft HTML invoice: friendly rounded sans, a pill invoice badge, pastel party
 * cards and summary chips, and a shadowed white table card whose header rows
 * render as blue bands.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 */
export function softHtml(data: InvoiceData, logo?: string): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const balance = balanceValue(items.rows);
  const body = `<main class="invoice">
<header class="head">
<div class="ident">
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<span class="name">${e(sender.business_name)}</span>
</div>
<div class="no">
<span class="lbl">Invoice</span>
<span class="badge">#${e(meta.invoiceNo)}</span>
</div>
</header>
<div class="parties">
<section class="card blue">
<span class="lbl">From</span>
<address>
<span class="name">${e(sender.business_name)}</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
</section>
<section class="card mint">
<span class="lbl">Bill to</span>
<address>
${recipient.contact_name ? `<span class="name">${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span class="name">${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${links(contactValues(recipient.emails), mailHref)}
${links(contactValues(recipient.phones), telHref)}
${links(contactValues(recipient.websites), webHref)}
</address>
</section>
</div>
<dl class="summary">
<div class="blue"><dt>Issue date</dt><dd>${e(meta.issueDate)}</dd></div>
${meta.dueDate ? `<div class="mint"><dt>Due date</dt><dd>${e(meta.dueDate)}</dd></div>` : ""}
<div class="peach${meta.dueDate ? "" : " wide"}"><dt>Notes</dt><dd>${escAddr(meta.notes)}</dd></div>
<div class="peach balance"><dt>Balance</dt><dd>${e(balance)}</dd></div>
</dl>
<div class="tablecard">
${itemsTable(items, "items")}
</div>
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body);
}
