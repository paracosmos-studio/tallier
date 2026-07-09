// slate: full-bleed charcoal panel, cards overlapping its edge, amber accent
#let inv = json(bytes(sys.inputs.invoice))
#let charcoal = rgb("#1A1C1E")
#let amber = rgb("#E8A13C")
#let red = rgb("#D0342C")
#let ghost = rgb("#C9CCD1")
#let rowfill = rgb("#F1F2F3")
#let ink = rgb("#1F2124")
#let cardline = luma(216)
#let edge = 22pt
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let web-url(v) = if v.starts-with("http") { v } else { "https://" + v }
#let tel-url(v) = "tel:" + v.replace(regex("[^+0-9]"), "")
#let caps(t, fill: ghost) = text(size: 8.5pt, fill: fill, weight: "medium", tracking: 0.09em)[#upper(t)]
#let balance = {
  let bands = inv.items.rows.filter(r => r.kind == "header")
  let v = if bands.len() == 0 { none } else { bands.last().cells.rev().find(c => c != "") }
  if v == none { "" } else { v }
}
#let numeric-from = calc.max(1, inv.items.columns.len() - 3)
#let all-rows = ((kind: "header", cells: inv.items.columns),) + inv.items.rows
#let hrow2(cells, lead, rest) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, lead(cells.first())), ..cells.slice(span).map(rest))
}
#let card(name, value, accent: ink, weight: "semibold") = block(
  fill: white, stroke: 0.5pt + cardline, radius: 6pt, width: 100%, inset: (x: 11pt, y: 10pt),
  stack(spacing: 5pt, caps(name, fill: luma(140)), text(fill: accent, weight: weight, value)),
)

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: (top: 0pt, x: 0pt, bottom: 18pt))
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 10pt, fill: ink)
#show link: set text(fill: amber)

#block(width: 100%, fill: charcoal, inset: (x: edge, top: 34pt, bottom: 52pt))[
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    [
      #if "/sender-logo" in sys.inputs {
        image("/sender-logo", height: 40pt)
      } else {
        text(fill: white, size: 19pt, weight: "bold")[#inv.sender.business_name]
      }
    ],
    [
      #text(fill: white, size: 26pt, weight: "bold")[INVOICE] \
      #text(fill: ghost, size: 12pt, weight: "medium")[\##inv.meta.invoiceNo]
    ],
  )
  #v(30pt)
  #grid(
    columns: (1fr, 1fr),
    column-gutter: 24pt,
    [
      #caps("From")
      #v(5pt)
      #set text(fill: ghost)
      #text(fill: white, size: 12pt, weight: "semibold")[#inv.sender.business_name] \
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
      #set text(fill: ghost)
      #lines(
        if inv.recipient.contact_name != none { text(fill: white, size: 12pt, weight: "semibold")[#inv.recipient.contact_name] } else { none },
        if inv.recipient.company_name != none { text(fill: white, size: 12pt, weight: "semibold")[#inv.recipient.company_name] } else { none },
        block-addr(inv.recipient.mailing_address),
        ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
        ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
        ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
      )
    ],
  )
]

#pad(x: edge)[
  #v(-30pt)
  #grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    column-gutter: 10pt,
    card("Issue date", inv.meta.issueDate),
    ..if inv.meta.dueDate != "" { (card("Due date", inv.meta.dueDate),) } else { () },
    grid.cell(
      colspan: if inv.meta.dueDate != "" { 1 } else { 2 },
      card("Notes", block-addr(inv.meta.notes), weight: "regular"),
    ),
    card("Balance", balance, accent: red),
  )
]

#pad(x: edge, top: 26pt, bottom: 34pt)[
  #table(
    columns: inv.items.widths.map(w => w * 1fr),
    stroke: none,
    inset: (x: 10pt, y: 8pt),
    align: (x, _) => if x >= numeric-from { right } else { left },
    fill: (_, y) => if all-rows.at(y).kind == "header" { rowfill },
    ..all-rows.map(r => if r.kind == "header" {
      hrow2(r.cells, c => text(fill: ink, weight: "semibold", c), c => text(fill: ink, weight: "medium", c))
    } else { r.cells }).flatten(),
  )
]
