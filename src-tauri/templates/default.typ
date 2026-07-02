// default: us-letter, borderless, gray-fill hierarchy
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(26)
#let gray = rgb("#f2f2f2")
#let blue = rgb("#1d4ed8")
#let red = rgb("#991b1b")
#let green = rgb("#15803d")
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let row-pair(r) = {
  let cells = r.filter(c => c != "")
  if cells.len() == 0 { ("", "") } else if cells.len() == 1 { (cells.first(), "") } else { (cells.first(), cells.last()) }
}
#let negative(v) = v.trim().starts-with("-")
#let balance = if inv.totals.len() > 0 { row-pair(inv.totals.last()).last() } else { "" }
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let strip(label, value, tint: ink) = stack(
  spacing: 3pt,
  block(fill: gray, width: 100%, inset: (x: 8pt, y: 6pt), strong(label)),
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
  inset: (x: 8pt, y: 7pt),
  row-gutter: 2.5pt,
  align: (x, _) => if x >= numeric-from { right } else { left },
  fill: (_, y) => if y == 0 { gray },
  table.header(..inv.items.columns.map(c => strong(c))),
  ..inv.items.rows.flatten(),
)

#if inv.totals.len() > 0 {
  v(28pt)
  align(right, box(width: 32%, table(
    columns: (1fr, auto),
    stroke: none,
    inset: (x: 8pt, y: 6pt),
    align: (x, _) => if x == 0 { left } else { right },
    fill: (x, _) => if x == 0 { gray },
    ..inv.totals.enumerate().map(((i, r)) => {
      let (label, value) = row-pair(r)
      let tint = if negative(value) { green } else { ink }
      let cell = text(fill: tint, value)
      (strong(text(fill: tint, label)), if i == inv.totals.len() - 1 { strong(cell) } else { cell })
    }).flatten(),
  )))
}
