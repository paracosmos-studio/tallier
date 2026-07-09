// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

// classic: formal serif, ruled table, navy headings, italic footer
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(20)
#let navy = rgb("#1b2a4a")
#let hair = luma(205)
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
#let sc(s) = smallcaps(text(tracking: 0.09em, s))

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "us-letter", margin: 27pt)
#set text(font: ("Noto Serif", "Noto Sans", "Arial"), size: 10.5pt, fill: ink)

#grid(
  columns: (1fr, 168pt),
  column-gutter: 24pt,
  align: (left + top, right + top),
  [
    #text(size: 21pt, fill: navy)[#smallcaps(inv.sender.business_name)]
    #v(4pt)
    #text(size: 9.5pt, fill: luma(70))[#lines(
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails),
      ..contacts(inv.sender.phones),
      if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
    )]
  ],
  [
    #text(size: 16pt, fill: navy, tracking: 0.2em)[#upper("Invoice")]
    #v(5pt)
    #line(length: 100%, stroke: 1pt + ink)
    #v(6pt)
    #text(size: 10pt)[\##inv.meta.invoiceNo]
  ],
)

#v(26pt)
#text(fill: navy, weight: "bold")[#sc("Bill To")]
#v(3pt)
#lines(
  inv.recipient.contact_name,
  inv.recipient.company_name,
  block-addr(inv.recipient.mailing_address),
  ..contacts(inv.recipient.emails),
  ..contacts(inv.recipient.phones),
  ..contacts(inv.recipient.websites),
)

#v(22pt)
#line(length: 100%, stroke: 0.5pt + ink)
#block(inset: (y: 9pt), grid(
  columns: (auto, 1fr),
  row-gutter: 6pt,
  column-gutter: 16pt,
  text(weight: "bold")[Issue date], inv.meta.issueDate,
  ..if inv.meta.dueDate != "" { (text(weight: "bold")[Due date], inv.meta.dueDate) } else { () },
  text(weight: "bold")[Balance], balance,
))
#line(length: 100%, stroke: 0.5pt + ink)

#v(24pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  stroke: none,
  inset: (x: 7pt, y: 6.5pt),
  align: (x, _) => if x >= numeric-from { right } else { left },
  ..all-rows.map(r => {
    let styled = if r.kind == "header" {
      hrow(r.cells, c => text(weight: "bold", fill: navy, c))
    } else { r.cells }
    (..styled, table.hline(stroke: 0.5pt + hair))
  }).flatten(),
)

#if inv.meta.notes != "" {
  v(22pt)
  align(center, text(style: "italic", fill: luma(95))[#inv.meta.notes])
}
