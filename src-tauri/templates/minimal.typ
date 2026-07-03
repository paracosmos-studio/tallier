// minimal: single sans, black on white, whitespace-forward, two hairline rules
#let inv = json(bytes(sys.inputs.invoice))
#let ink = black
#let muted = luma(120)
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
#let field(label, value) = if value == none { none } else {
  stack(spacing: 5pt, text(size: 9.5pt, fill: muted, label), text(size: 12pt, value))
}

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "us-letter", margin: 54pt)
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 11pt, fill: ink)

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  text(size: 16pt, weight: "bold")[#inv.sender.business_name],
  text(size: 11pt, fill: muted)[Invoice \##inv.meta.invoiceNo],
)

#v(48pt)
#grid(
  columns: (1fr, 1fr),
  column-gutter: 24pt,
  field("From", lines(
    block-addr(inv.sender.mailing_address),
    ..contacts(inv.sender.emails).map(c => link("mailto:" + c)[#c]),
    ..contacts(inv.sender.phones).map(c => link(tel-url(c))[#c]),
    if inv.sender.tax_id != none { "Tax ID: " + inv.sender.tax_id },
  )),
  field("Bill to", lines(
    inv.recipient.contact_name,
    inv.recipient.company_name,
    block-addr(inv.recipient.mailing_address),
    ..contacts(inv.recipient.emails).map(c => link("mailto:" + c)[#c]),
    ..contacts(inv.recipient.phones).map(c => link(tel-url(c))[#c]),
    ..contacts(inv.recipient.websites).map(c => link(web-url(c))[#c]),
  )),
)

#let meta-fields = (
  (field("Issue date", inv.meta.issueDate),)
    + if inv.meta.dueDate != "" { (field("Due date", inv.meta.dueDate),) } else { () }
).filter(x => x != none)
#v(40pt)
#grid(columns: meta-fields.map(_ => auto), column-gutter: 48pt, ..meta-fields)
#if inv.meta.notes != "" {
  v(28pt)
  field("Notes", block-addr(inv.meta.notes))
}

#v(48pt)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  inset: (x, y) => (
    left: if x == 0 { 0pt } else { 8pt },
    right: if x == inv.items.columns.len() - 1 { 0pt } else { 8pt },
    top: 10pt,
    bottom: 10pt,
  ),
  align: (x, _) => if x >= numeric-from { right } else { left },
  stroke: none,
  ..all-rows.map(r => if r.kind == "header" {
    hrow(r.cells, c => text(weight: "bold", c))
  } else { r.cells }).flatten(),
)
