// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { balanceValue, contactValues, docShell, escAddr, htmlEscape, itemsTable, links, mailHref, telHref, webHref } from "./shared";

const CSS = `:root { --ink: #2a2a2a; --muted: #767676; --line: #cfcfcf; --zebra: #f7f7f7; --blue: #2563eb; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.82rem; line-height: 1.45; margin: 2.5rem auto; padding: 0 1.75rem; }
.invoice a { color: var(--blue); text-decoration: none; }
.lbl { display: block; font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.65rem; }
.head { display: grid; grid-template-columns: 1.3fr 1.3fr 0.7fr 0.9fr; gap: 1.25rem; }
.head .logo { display: block; height: 20px; width: auto; margin-bottom: 0.4rem; }
.head address { display: flex; flex-direction: column; gap: 0.1rem; }
.head .stack { display: flex; flex-direction: column; gap: 0.75rem; }
.head .r { text-align: right; }
.head p { margin: 0; }
.items { margin-top: 1.25rem; }
.items th, .items td { padding: 0.28rem 0.5rem; vertical-align: top; }
.items tbody th { text-align: left; font-weight: 700; }
.items tbody tr:nth-child(odd):not(.section) { background: var(--zebra); }
.items tr.section th, .items tr.section td { font-weight: 700; }
.items .num { text-align: right; }
.notes { margin: 1rem 0 0; color: var(--muted); font-size: 0.75rem; }
@media (max-width: 640px) { .head { grid-template-columns: 1fr 1fr; } .head .r { text-align: left; } }`;

/**
 * Compact HTML invoice: a dense grayscale layout that folds the summary into a
 * four-column header row, zebra-stripes the items table for readability and
 * reserves colour for utility-blue links only.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, rendered small when present.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 * @param avatar - Recipient avatar as a data URI, rendered small when present.
 */
export function compactHtml(
  data: InvoiceData,
  logo?: string,
  stamp?: ExportStamp,
  avatar?: string,
): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const balance = balanceValue(items.rows);
  const body = `<main class="invoice">
<header class="head">
<address>
<span class="lbl">From</span>
${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
<strong>${e(sender.business_name)}</strong>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
<address>
<span class="lbl">Bill to</span>
${avatar ? `<img class="logo" src="${avatar}" alt="">` : ""}
${recipient.contact_name ? `<strong>${e(recipient.contact_name)}</strong>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${links(contactValues(recipient.emails), mailHref)}
${links(contactValues(recipient.phones), telHref)}
${links(contactValues(recipient.websites), webHref)}
</address>
<div class="stack">
<div><span class="lbl">Invoice</span><strong>#${e(meta.invoiceNo)}</strong></div>
<div><span class="lbl">Issued</span><p>${e(meta.issueDate)}</p></div>
</div>
<div class="stack r">
${meta.dueDate ? `<div><span class="lbl">Due</span><p>${e(meta.dueDate)}</p></div>` : ""}
${balance ? `<div><span class="lbl">Balance</span><strong>${e(balance)}</strong></div>` : ""}
</div>
</header>
${itemsTable(items, "items")}
${meta.notes ? `<p class="notes">${escAddr(meta.notes)}</p>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
