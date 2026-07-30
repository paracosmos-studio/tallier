// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { contactValues, docShell, escAddr, htmlEscape, itemsTable, links, mailHref, telHref, webHref } from "./shared";

const CSS = `:root { --ink: #1c1c1c; --muted: #808080; --line: #e2e0da; --accent: #d95d39; --paper: #fafaf7; --sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
body { background: var(--paper); }
.invoice { color: var(--ink); font-family: var(--sans); font-size: 0.95rem; line-height: 1.55; max-width: 52rem; padding: 2.65rem 2.65rem 2rem; }
.invoice a { color: inherit; text-decoration: none; }
.lbl { display: block; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.display { margin: 0; font-size: 3.75rem; line-height: 1; font-weight: 700; letter-spacing: -0.03em; }
.docno { margin: 0.15rem 0 0; color: var(--accent); font-weight: 500; }
.layout { display: grid; grid-template-columns: 30% 1fr; gap: 2.5rem; margin-top: 2.5rem; }
.meta-col { display: flex; flex-direction: column; }
.block { margin: 0 0 1.5rem; }
.block address { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }
.block p { margin: 0.75rem 0 0; }
.items { align-self: start; }
.items tbody th, .items tbody td { text-align: left; padding: 0.65rem 0.5rem; border-top: 1px solid var(--line); vertical-align: top; }
.items tbody tr:first-child > * { border-top: 0; }
.items th:first-child, .items td:first-child { padding-left: 0; }
.items th:last-child, .items td:last-child { padding-right: 0; }
.items tr.section th, .items tr.section td { font-weight: 700; }
.items .num { text-align: right; }
.foot { margin-top: 4rem; color: var(--muted); font-size: 0.75rem; }
@media (max-width: 640px) { .layout { grid-template-columns: 1fr; } }`;

/**
 * Studio HTML invoice: editorial off-white layout with an oversized display
 * heading, a 30/70 meta/items split and a single burnt-orange accent reserved
 * for the invoice number and the balance figure.
 *
 * @param data - Assembled invoice model.
 * @param logo - Sender logo as a data URI; ignored, the design renders no logo.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 */
export function studioHtml(data: InvoiceData, logo?: string, stamp?: ExportStamp): string {
  void logo;
  const { sender, recipient, meta, items } = data;
  const e = htmlEscape;
  const contact = contactValues(sender.emails)[0] ?? contactValues(sender.phones)[0] ?? "";
  const body = `<main class="invoice">
<header>
<h1 class="display">Invoice</h1>
<p class="docno">#${e(meta.invoiceNo)}</p>
</header>
<div class="layout">
<div class="meta-col">
<section class="block">
<span class="lbl">From</span>
<address>
<span>${e(sender.business_name)}</span>
${sender.mailing_address ? `<span>${escAddr(sender.mailing_address)}</span>` : ""}
${links(contactValues(sender.emails), mailHref)}
${links(contactValues(sender.phones), telHref)}
${sender.tax_id ? `<span>Tax ID: ${e(sender.tax_id)}</span>` : ""}
</address>
</section>
<section class="block">
<span class="lbl">Billed to</span>
<address>
${recipient.contact_name ? `<span>${e(recipient.contact_name)}</span>` : ""}
${recipient.company_name ? `<span>${e(recipient.company_name)}</span>` : ""}
${recipient.mailing_address ? `<span>${escAddr(recipient.mailing_address)}</span>` : ""}
${links(contactValues(recipient.emails), mailHref)}
${links(contactValues(recipient.phones), telHref)}
${links(contactValues(recipient.websites), webHref)}
</address>
</section>
<div class="block">
<span class="lbl">Issued</span>
<p>${e(meta.issueDate)}</p>
</div>
${meta.dueDate ? `<div class="block"><span class="lbl">Due</span><p>${e(meta.dueDate)}</p></div>` : ""}
${meta.notes ? `<div class="block"><span class="lbl">Notes</span><p>${escAddr(meta.notes)}</p></div>` : ""}
</div>
${itemsTable(items, "items")}
</div>
${contact ? `<footer class="foot">${e(sender.business_name)} &middot; ${e(contact)}</footer>` : ""}
</main>`;
  return docShell(`Invoice ${meta.invoiceNo}`, CSS, body, stamp);
}
