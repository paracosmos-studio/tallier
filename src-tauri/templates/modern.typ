// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

// modern: green full-bleed band, decorative arc, chip summary, banded rows
#let inv = json(bytes(sys.inputs.invoice))
#let green = rgb("#3E6B34")
#let tint = rgb("#9ECB78")
#let pale = rgb("#F0F7EA")
#let ink = rgb("#1F2430")
#let muted = luma(140)
#let edge = 22pt
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let caps(t) = text(size: 8.5pt, fill: muted, weight: "medium", tracking: 0.09em)[#upper(t)]
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
#let chip(name, value, accent: ink) = block(
  fill: pale, radius: 8pt, width: 100%, inset: (x: 11pt, y: 9pt),
  stack(spacing: 5pt, caps(name), text(fill: accent, weight: "semibold", value)),
)

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: (top: 0pt, x: 0pt, bottom: 18pt))
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 10pt, fill: ink)
#show link: set text(fill: green)

#block(width: 100%, fill: green, inset: (x: edge, top: 30pt, bottom: 30pt))[
  #set text(fill: white)
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    [
      #if "/sender-logo" in sys.inputs {
        image("/sender-logo", height: 42pt)
      } else {
        text(size: 19pt, weight: "bold")[#inv.sender.business_name]
      }
    ],
    [
      #text(size: 27pt, weight: "bold")[Invoice] \
      #text(size: 12pt, weight: "medium")[\##inv.meta.invoiceNo]
    ],
  )
  #place(top + right, dx: 45pt, dy: -66pt, circle(radius: 90pt, fill: tint.transparentize(70%)))
]

#pad(x: edge, top: 26pt, bottom: 34pt)[
  #grid(
    columns: (1fr, 1fr),
    column-gutter: 24pt,
    [
      #caps("From")
      #v(5pt)
      #text(size: 12pt, weight: "semibold")[#inv.sender.business_name] \
      #lines(
        block-addr(inv.sender.mailing_address),
        ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
        ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
        if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
      )
    ],
    [
      #caps("Bill to")
      #v(5pt)
      #lines(
        if inv.recipient.contact_name != none { text(size: 12pt, weight: "semibold")[#inv.recipient.contact_name] } else { none },
        if inv.recipient.company_name != none { text(size: 12pt, weight: "semibold")[#inv.recipient.company_name] } else { none },
        block-addr(inv.recipient.mailing_address),
        ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
        ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
        ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
      )
    ],
  )

  #v(24pt)
  #grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    column-gutter: 8pt,
    chip("Issue date", inv.meta.issueDate),
    ..if inv.meta.dueDate != "" { (chip("Due date", inv.meta.dueDate),) } else { () },
    grid.cell(
      colspan: if inv.meta.dueDate != "" { 1 } else { 2 },
      chip("Notes", block-addr(inv.meta.notes)),
    ),
    chip("Balance", balance, accent: green),
  )

  #v(26pt)
  #table(
    columns: inv.items.widths.map(w => w * 1fr),
    stroke: none,
    inset: (x: 10pt, y: 8pt),
    row-gutter: 3pt,
    align: (x, _) => if x >= numeric-from { right } else { left },
    fill: (_, y) => if all-rows.at(y).kind == "header" { pale },
    ..all-rows.map(r => if r.kind == "header" {
      hrow(r.cells, c => text(fill: green, weight: "semibold", c))
    } else { r.cells }).flatten(),
  )
]
