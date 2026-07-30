// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

// soft: rounded pastel cards, nunito face, coral accent, white table card
#let inv = json(bytes(sys.inputs.invoice))
#let pblue = rgb("#EAF2FF")
#let mint = rgb("#E8F7EE")
#let peach = rgb("#FFF1E8")
#let charcoal = rgb("#3A3F47")
#let coral = rgb("#F2876B")
#let muted = rgb("#8A909B")
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let caps(t) = text(size: 8.5pt, fill: muted, weight: "bold", tracking: 0.08em)[#upper(t)]
#let balance = {
  let bands = inv.items.rows.filter(r => r.kind == "header")
  let v = if bands.len() == 0 { none } else { bands.last().cells.rev().find(c => c != "") }
  if v == none { "" } else { v }
}
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let all-rows = ((kind: "header", cells: inv.items.columns),) + inv.items.rows
#let hrow(cells, style) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, style(cells.first())), ..cells.slice(span).map(style))
}
#let addr-card(fill, name, body) = block(
  fill: fill, radius: 12pt, width: 100%, inset: (x: 15pt, y: 14pt),
  stack(spacing: 6pt, caps(name), body),
)
#let chip(fill, name, value, accent: charcoal) = block(
  fill: fill, radius: 10pt, width: 100%, inset: (x: 12pt, y: 11pt),
  stack(spacing: 5pt, caps(name), text(fill: accent, weight: "bold", value)),
)

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: 1.1cm)
#set text(font: ("Nunito", "Noto Sans", "Arial"), size: 10pt, fill: charcoal)
#show link: set text(fill: coral)

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  [
    #if "/sender-logo" in sys.inputs {
      grid(
        columns: (auto, auto),
        column-gutter: 10pt,
        align: horizon,
        image("/sender-logo", height: 34pt),
        text(size: 16pt, weight: "bold")[#inv.sender.business_name],
      )
    } else {
      text(size: 18pt, weight: "bold")[#inv.sender.business_name]
    }
  ],
  align(right)[
    #caps("Invoice")
    #v(5pt)
    #box(fill: pblue, radius: 20pt, inset: (x: 14pt, y: 7pt))[
      #text(fill: charcoal, weight: "bold", size: 12pt)[\##inv.meta.invoiceNo]
    ]
  ],
)

#v(20pt)
#grid(
  columns: (1fr, 1fr),
  column-gutter: 16pt,
  addr-card(pblue, "From", [
    #text(weight: "bold")[#inv.sender.business_name] \
    #lines(
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
      if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
    )
  ]),
  addr-card(mint, "Bill to", lines(
    if inv.recipient.contact_name != none { text(weight: "bold")[#inv.recipient.contact_name] } else { none },
    if inv.recipient.company_name != none { text(weight: "bold")[#inv.recipient.company_name] } else { none },
    block-addr(inv.recipient.mailing_address),
    ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
    ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
    ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
  )),
)

#v(14pt)
#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  column-gutter: 10pt,
  chip(pblue, "Issue date", inv.meta.issueDate),
  ..if inv.meta.dueDate != "" { (chip(mint, "Due date", inv.meta.dueDate),) } else { () },
  grid.cell(
    colspan: if inv.meta.dueDate != "" { 1 } else { 2 },
    chip(peach, "Notes", block-addr(inv.meta.notes)),
  ),
  chip(peach, "Balance", balance, accent: coral),
)

#v(18pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  stroke: none,
  inset: (x: 9pt, y: 8pt),
  row-gutter: 3pt,
  align: (x, _) => if x >= numeric-from { right } else { left },
  fill: (_, y) => if all-rows.at(y).kind == "header" { pblue },
  ..all-rows.map(r => if r.kind == "header" {
    hrow(r.cells, c => text(weight: "bold", c))
  } else { r.cells }).flatten(),
)
