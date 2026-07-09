// studio: editorial off-white, oversized display heading, burnt-orange accent
#let inv = json(bytes(sys.inputs.invoice))
#let ink = luma(28)
#let muted = luma(130)
#let rule = luma(210)
#let accent = rgb("#d95d39")
#let paper = rgb("#fafaf7")
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
#let label-txt(t) = text(size: 8pt, tracking: 0.1em, fill: muted)[#upper(t)]
#let meta-block(label, value) = if value == none { none } else {
  block(below: 22pt, stack(spacing: 9pt, label-txt(label), text(size: 10.5pt, value)))
}
#let first-contact = {
  let e = contacts(inv.sender.emails)
  let p = contacts(inv.sender.phones)
  if e.len() > 0 { e.first() } else if p.len() > 0 { p.first() } else { none }
}

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(
  paper: "us-letter",
  margin: (x: 32pt, top: 32pt, bottom: 24pt),
  fill: paper,
  footer: if first-contact != none {
    text(size: 8pt, fill: muted)[#inv.sender.business_name #h(6pt) · #h(6pt) #first-contact]
  },
)
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 11pt, fill: ink)

#text(size: 60pt, weight: "bold", tracking: -0.03em)[Invoice]
#v(-6pt)
#text(size: 13pt, weight: "medium", fill: accent)[\##inv.meta.invoiceNo]

#v(30pt)
#grid(
  columns: (30%, 1fr),
  column-gutter: 40pt,
  [
    #meta-block("From", lines(
      inv.sender.business_name,
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
      if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
    ))
    #meta-block("Billed to", lines(
      inv.recipient.contact_name,
      inv.recipient.company_name,
      block-addr(inv.recipient.mailing_address),
      ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
      ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
      ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
    ))
    #meta-block("Issued", inv.meta.issueDate)
    #if inv.meta.dueDate != "" { meta-block("Due", inv.meta.dueDate) }
    #if inv.meta.notes != "" { meta-block("Notes", block-addr(inv.meta.notes)) }
  ],
  table(
    columns: inv.items.widths.map(w => w * 1fr),
    stroke: (x, y) => if y > 0 { (top: 0.5pt + rule) },
    inset: (x, y) => (
      left: if x == 0 { 0pt } else { 8pt },
      right: if x == inv.items.columns.len() - 1 { 0pt } else { 8pt },
      top: 9pt,
      bottom: 9pt,
    ),
    align: (x, _) => if x >= numeric-from { right } else { left },
    ..all-rows.map(r => if r.kind == "header" {
      hrow(r.cells, c => text(weight: "bold", c))
    } else { r.cells }).flatten(),
  ),
)
