// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

// default: us-letter, borderless, gray-fill hierarchy
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(26)
#let gray = rgb("#f2f2f2")
#let blue = rgb("#1d4ed8")
#let red = rgb("#991b1b")
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let balance = {
  let bands = inv.items.rows.filter(r => r.kind == "header")
  let v = if bands.len() == 0 { none } else { bands.last().cells.rev().find(c => c != "") }
  if v == none { "" } else { v }
}
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let all-rows = ((kind: "header", cells: inv.items.columns),) + inv.items.rows
#let band(y) = all-rows.at(y).kind == "header"
#let hrow(cells, style) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, style(cells.first())), ..cells.slice(span).map(style))
}
#let strip(label, value, tint: ink) = stack(
  spacing: 3pt,
  block(fill: gray, width: 100%, inset: (x: 8pt, y: 6pt), text(weight: "medium", label)),
  block(width: 100%, inset: (x: 8pt, y: 4pt), text(fill: tint, value)),
)

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "us-letter", margin: 36pt)
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 10.5pt, fill: ink)
#show link: set text(fill: blue)

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right),
  [#if "/sender-logo" in sys.inputs { image("/sender-logo", height: 52pt) }],
  [
    #text(size: 24pt, weight: "bold")[INVOICE] \
    #text(size: 12pt, weight: "semibold")[\##inv.meta.invoiceNo]
  ],
)

#v(14pt)
#grid(
  columns: (1fr, 1fr),
  column-gutter: 18pt,
  [
    #text(size: 13pt, weight: "bold")[#inv.sender.business_name] \
    #lines(
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
      if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
    )
  ],
  [
    #text(size: 11.5pt, weight: "bold")[Bill To] \
    #lines(
      inv.recipient.contact_name,
      inv.recipient.company_name,
      block-addr(inv.recipient.mailing_address),
      ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
      ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
    )
  ],
)

#v(34pt)
#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  column-gutter: 3pt,
  strip("Issue date", inv.meta.issueDate),
  ..if inv.meta.dueDate != "" { (strip("Due date", inv.meta.dueDate),) } else { () },
  grid.cell(
    colspan: if inv.meta.dueDate != "" { 1 } else { 2 },
    strip("Notes", block-addr(inv.meta.notes)),
  ),
  strip("Balance", balance, tint: red),
)

#v(30pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  stroke: none,
  inset: (_, y) => (x: 8pt, y: if band(y) { 7pt } else { 5.5pt }),
  row-gutter: 2.5pt,
  align: (x, _) => if x >= numeric-from { right } else { left },
  fill: (_, y) => if band(y) { gray },
  ..all-rows.map(r => if r.kind == "header" {
    hrow(r.cells, c => text(weight: "medium", c))
  } else { r.cells }).flatten(),
)
