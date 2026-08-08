// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

// compact: dense grayscale, zebra rows, four-column header, utility-blue links
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(30)
#let muted = luma(120)
#let rule = luma(190)
#let zebra = rgb("#f7f7f7")
#let blue = rgb("#2563eb")
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let all-rows = ((kind: "header", cells: inv.items.columns),) + inv.items.rows
#let hrow(cells, style) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, style(cells.first())), ..cells.slice(span).map(style))
}
#let last-h-idx = {
  let idx = none
  for (i, r) in inv.items.rows.enumerate() { if r.kind == "header" { idx = i } }
  idx
}
#let balance = if last-h-idx == none { none } else {
  inv.items.rows.at(last-h-idx).cells.rev().find(c => c != "")
}
#let label-txt(t) = text(size: 7.5pt, tracking: 0.08em, fill: muted)[#upper(t)]
#let cell(label, value) = if value == none { none } else {
  stack(spacing: 8pt, label-txt(label), value)
}

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "us-letter", margin: 30pt)
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 9.5pt, fill: ink)
#show link: set text(fill: blue)

#grid(
  columns: (1.3fr, 1.3fr, 0.7fr, 0.9fr),
  column-gutter: 20pt,
  align: (left, left, left, right),
  cell([From], {
    if "/sender-logo" in sys.inputs { image("/sender-logo", height: 20pt); v(5pt) }
    lines(
      text(weight: "bold")[#inv.sender.business_name],
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
      if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
    )
  }),
  cell([Bill to], {
    if "/recipient-avatar" in sys.inputs { image("/recipient-avatar", height: 20pt); v(5pt) }
    lines(
      if inv.recipient.contact_name != none { text(weight: "bold")[#inv.recipient.contact_name] } else { none },
      inv.recipient.company_name,
      block-addr(inv.recipient.mailing_address),
      ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
      ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
    )
  }),
  stack(
    spacing: 12pt,
    cell([Invoice], text(weight: "bold")[\##inv.meta.invoiceNo]),
    cell([Issued], inv.meta.issueDate),
  ),
  stack(
    spacing: 12pt,
    cell([Due], if inv.meta.dueDate != "" { inv.meta.dueDate } else { none }),
    cell([Balance], if balance != none { text(weight: "bold")[#balance] } else { none }),
  ),
)

#v(20pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  inset: (x, y) => (
    left: if x == 0 { 6pt } else { 8pt },
    right: if x == inv.items.columns.len() - 1 { 6pt } else { 8pt },
    top: 4.5pt,
    bottom: 4.5pt,
  ),
  align: (x, _) => if x >= numeric-from { right } else { left },
  stroke: none,
  fill: (_, y) => if all-rows.at(y).kind != "header" and calc.even(y) { zebra },
  ..all-rows.map(r => if r.kind == "header" {
    hrow(r.cells, c => text(weight: "bold", c))
  } else { r.cells }).flatten(),
)

#if inv.meta.notes != "" {
  v(16pt)
  text(size: 8.5pt, fill: muted)[#block-addr(inv.meta.notes)]
}
