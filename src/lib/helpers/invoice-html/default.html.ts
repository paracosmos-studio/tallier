// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
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

const CSS = `:root { --ink: #1a1a1a; --fill: #f2f2f2; --blue: #1d4ed8; --red: #991b1b; --green: #15803d; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; margin: 2.5rem auto; padding: 0 1.75rem; }
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
.items tbody td { padding-top: 6px; padding-bottom: 6px; }
.items .section th, .items .section td { background: var(--fill); font-weight: 500; padding: 0.5rem 0.6rem; }
.num { text-align: right; }`;

/**
 * Default HTML invoice: borderless letter layout with gray-fill hierarchy,
 * a four-up summary strip and in-place gray section/totals bands.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function defaultHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const balance = balanceValue(items.rows);
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
${itemsTable(items, "items")}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
