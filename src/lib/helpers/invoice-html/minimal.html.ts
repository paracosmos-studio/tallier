// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { contactValues, docShell, escAddr, htmlEscape, itemsTable, links, mailHref, telHref, webHref } from "./shared";

const CSS = `:root { --ink: #111111; --muted: #767676; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.95rem; line-height: 1.55; }
.invoice a { color: inherit; text-decoration: none; }
.lbl { color: var(--muted); font-size: 0.8rem; font-weight: 400; }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 2rem; }
.head h1 { margin: 0; font-size: 1.2rem; font-weight: 700; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 3rem 0; }
.parties h2 { margin: 0 0 0.45rem; font-size: 0.8rem; font-weight: 400; color: var(--muted); }
.parties address { display: flex; flex-direction: column; gap: 0.15rem; }
.meta { display: flex; flex-wrap: wrap; gap: 3rem; margin: 0; padding: 0; }
.meta div { display: flex; flex-direction: column; gap: 0.35rem; }
.meta dt { color: var(--muted); font-size: 0.8rem; }
.meta dd { margin: 0; }
.notes { display: flex; flex-direction: column; gap: 0.35rem; margin: 1.5rem 0 0; padding: 0; }
.notes dd { margin: 0; }
.items { margin-top: 3rem; }
.items th, .items td { padding: 0.7rem 0.5rem; vertical-align: top; }
.items tbody th { text-align: left; font-weight: 600; }
.items tr.section th, .items tr.section td { font-weight: 600; }
.items th:first-child, .items td:first-child { padding-left: 0; }
.items th:last-child, .items td:last-child { padding-right: 0; }
.items .num { text-align: right; }
@media (max-width: 560px) { .parties { grid-template-columns: 1fr; } }`;

/**
 * Minimal HTML invoice: one sans face, pure black on white, whitespace-forward
 * stacked label/value pairs, and an unruled items table with semibold header
 * bands.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI; ignored, the design renders no logo.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function minimalHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
  void logo;
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const body = `<main class="invoice">
<header class="head">
<h1>${e(sender.business_name)}</h1>
<span class="lbl">Invoice #${e(meta.invoiceNo)}</span>
</header>
<div class="parties">
<section>
<h2>From</h2>
<address>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
</section>
<section>
<h2>Bill to</h2>
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
<dl class="meta">
<div><dt>Issue date</dt><dd>${e(meta.issueDate)}</dd></div>
${meta.dueDate ? `<div><dt>Due date</dt><dd>${e(meta.dueDate)}</dd></div>` : ""}
</dl>
${meta.notes ? `<dl class="notes"><dt class="lbl">Notes</dt><dd>${escAddr(meta.notes)}</dd></dl>` : ""}
${itemsTable(items, "items")}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
