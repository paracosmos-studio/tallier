// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

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

const CSS = `:root { --charcoal: #1a1c1e; --amber: #e8a13c; --red: #d0342c; --ghost: #c9ccd1; --rowfill: #f1f2f3; --ink: #1f2124; --muted: #6b7280; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.9rem; line-height: 1.5; padding: 0 1.85rem 1.5rem; }
.invoice a { color: var(--amber); text-decoration: none; }
.panel { margin: 0 -1.85rem 0; padding: 2.85rem 1.85rem 4.35rem; background: var(--charcoal); color: #fff; }
.panel a { color: var(--amber); }
.panel .top { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; margin-bottom: 1.75rem; }
.panel .logo { height: 42px; width: auto; }
.panel .brand { font-size: 1.35rem; font-weight: 700; }
.panel .no { text-align: right; }
.panel h1 { margin: 0; font-size: 1.9rem; line-height: 1; font-weight: 700; }
.panel .no p { margin: 0.3rem 0 0; color: var(--ghost); font-weight: 500; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.parties address { color: var(--ghost); }
.parties .name { color: #fff; font-size: 1.05rem; font-weight: 600; }
.lbl { font-size: 0.7rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ghost); font-weight: 500; margin-bottom: 0.35rem; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin: -2.5rem 0 2.15rem; }
.summary div { position: relative; background: #fff; border-radius: 6px; padding: 0.7rem 0.8rem; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); }
.summary .wide { grid-column: span 2; }
.summary dt { font-size: 0.7rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
.summary dd { margin: 0.3rem 0 0; font-weight: 600; }
.summary .notes dd { font-weight: 400; }
.summary .balance dd { color: var(--red); }
.items { border-collapse: collapse; }
.items th, .items td { padding: 0.6rem 0.65rem; text-align: left; }
.items .num { text-align: right; }
.items tr.section { background: var(--rowfill); }
.items tr.section > :first-child { font-weight: 600; }
.items tr.section > :not(:first-child) { color: var(--ink); font-weight: 500; }`;

/**
 * Slate HTML invoice: full-bleed charcoal panel holding the brand, invoice
 * meta and party blocks, white summary cards overlapping the panel edge, and a
 * borderless table with uniform ink header bands; red marks the balance.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI, omitted when unset.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function slateHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const balance = balanceValue(items.rows);
  const body = `<main class="invoice">
<header class="panel">
<div class="top">
${logo ? `<img class="logo" src="${logo}" alt="">` : `<span class="brand">${e(sender.business_name)}</span>`}
<div class="no">
<h1>INVOICE</h1>
<p>#${e(meta.invoiceNo)}</p>
</div>
</div>
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
</header>
<dl class="summary">
<div><dt>Issue date</dt><dd>${e(meta.issueDate)}</dd></div>
${meta.dueDate ? `<div><dt>Due date</dt><dd>${e(meta.dueDate)}</dd></div>` : ""}
<div class="notes${meta.dueDate ? "" : " wide"}"><dt>Notes</dt><dd>${escAddr(meta.notes)}</dd></div>
<div class="balance"><dt>Balance</dt><dd>${e(balance)}</dd></div>
</dl>
${itemsTable(items, "items")}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
