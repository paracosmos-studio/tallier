// minimal: mono labels, hairline rules, terse
#let inv = json(bytes(sys.inputs.invoice))
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())
#let hrow(cells, style) = {
  let gap = cells.slice(1).position(c => c != "")
  let span = if gap == none { cells.len() } else { gap + 1 }
  (table.cell(colspan: span, style(cells.first())), ..cells.slice(span).map(style))
}
#let label(t) = text(font: "DM Mono", size: 8pt, fill: luma(120), tracking: 0.08em, upper(t))

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: 2.4cm)
#set text(font: ("Instrument Sans", "Noto Sans", "Arial"), size: 10pt, fill: luma(20))
#set table(stroke: none, inset: (x: 0pt, y: 6pt))

#grid(
  columns: (1fr, auto),
  align: (left, right),
  [
    #if "/sender-logo" in sys.inputs { image("/sender-logo", width: 84pt); v(0.5em) }
    #text(font: "DM Mono", size: 13pt)[#inv.sender.business_name]
  ],
  [
    #label("Invoice") \
    #text(font: "DM Mono")[#inv.meta.invoiceNo]
  ],
)

#line(length: 100%, stroke: 0.5pt + luma(210))
#v(0.8em)

#grid(
  columns: (1fr, 1fr, 1fr),
  [#label("Billed to") \ #lines(inv.recipient.contact_name, inv.recipient.company_name)],
  [#label("Issued") \ #inv.meta.issueDate],
  align(right)[#if inv.meta.dueDate != "" [ #label("Due") \ #inv.meta.dueDate ]],
)

#v(1.2em)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  table.header(..hrow(inv.items.columns, label)),
  table.hline(stroke: 0.5pt + luma(210)),
  ..inv.items.rows.map(r => if r.kind == "header" {
    (table.hline(stroke: 0.5pt + luma(210)), ..hrow(r.cells, strong))
  } else { r.cells }).flatten(),
)

#if inv.meta.notes != "" [ #v(1.4em) #line(length: 100%, stroke: 0.5pt + luma(210)) #v(0.6em) #text(size: 9pt, fill: luma(110))[#inv.meta.notes] ]
