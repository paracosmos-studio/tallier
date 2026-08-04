// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

// terminal: monospace receipt, dashed rules, dot leaders, uppercase labels
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(20)
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let all-rows = ((kind: "header", cells: inv.items.columns),) + inv.items.rows
#let hrow(cells, style) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, style(cells.first())), ..cells.slice(span).map(style))
}
#let balance = {
  let bands = inv.items.rows.filter(r => r.kind == "header")
  let v = if bands.len() == 0 { none } else { bands.last().cells.rev().find(c => c != "") }
  if v == none { "" } else { v }
}
#let dashed = (paint: ink, thickness: 0.6pt, dash: "dashed")
#let em(s) = text(weight: "medium", s)
#let rule = line(length: 100%, stroke: dashed)
#let leader(lbl, val) = if val == none or val == "" { none } else {
  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 5pt,
    align: (left + horizon, horizon, right + horizon),
    em(upper(lbl)),
    box(width: 100%, repeat(text(fill: luma(160))[.])),
    val,
  )
}

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "us-letter", margin: 24pt)
#set text(font: "DM Mono", size: 9.5pt, fill: ink)

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  em(text(size: 13pt)[#upper(inv.sender.business_name)]),
  em[\##inv.meta.invoiceNo],
)
#v(6pt)
#rule
#v(9pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 16pt,
  [
    #em[FROM] \
    #inv.sender.business_name \
    #lines(
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails),
      ..contacts(inv.sender.phones),
      if inv.sender.tax_id != none { "TAX ID: " + inv.sender.tax_id },
    )
  ],
  [
    #em[BILL TO] \
    #lines(
      inv.recipient.contact_name,
      inv.recipient.company_name,
      block-addr(inv.recipient.mailing_address),
      ..contacts(inv.recipient.emails),
      ..contacts(inv.recipient.phones),
      ..contacts(inv.recipient.websites),
    )
  ],
)

#v(12pt)
#stack(
  spacing: 6pt,
  leader("Issue date", inv.meta.issueDate),
  leader("Due date", inv.meta.dueDate),
  leader("Balance", balance),
)

#v(13pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  stroke: none,
  inset: (x, y) => (
    left: if x == 0 { 0pt } else { 5pt },
    right: if x == inv.items.columns.len() - 1 { 0pt } else { 5pt },
    top: 5pt,
    bottom: 5pt,
  ),
  align: (x, _) => if x >= numeric-from { right } else { left },
  ..all-rows.map(r => if r.kind == "header" {
    hrow(r.cells, c => em(c))
  } else { r.cells }).flatten(),
)

#if inv.meta.notes != "" {
  v(13pt)
  text(fill: luma(120))[#block-addr(inv.meta.notes)]
}
