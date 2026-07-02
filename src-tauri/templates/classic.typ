// classic: serif-toned sans, ruled table, formal
#let inv = json(bytes(sys.inputs.invoice))
#let opt(v) = if v == none { "" } else { v }
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: 2cm)
#set text(font: ("Instrument Sans", "Arial"), size: 10pt, fill: luma(30))
#set table(stroke: 0.5pt + luma(190), inset: 7pt)

#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #if "/sender-logo" in sys.inputs { image("/sender-logo", height: 38pt); v(0.6em) }
    #strong(inv.sender.business_name) \
    #block-addr(inv.sender.mailing_address)
    #for c in contacts(inv.sender.emails) [ \ #c ]
    #for c in contacts(inv.sender.phones) [ \ #c ]
    #if inv.sender.tax_id != none [ \ Tax ID: #inv.sender.tax_id ]
  ],
  [
    #text(size: 22pt, weight: "semibold")[INVOICE] \
    \##inv.meta.invoiceNo \
    Issued: #inv.meta.issueDate
    #if inv.meta.dueDate != "" [ \ Due: #inv.meta.dueDate ]
  ],
)

#v(1.6em)
#strong[Bill to] \
#lines(
  inv.recipient.contact_name,
  inv.recipient.company_name,
  block-addr(inv.recipient.mailing_address),
)

#v(1.2em)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  table.header(..inv.items.columns.map(c => strong(c))),
  ..inv.items.rows.flatten(),
  ..inv.totals.map(r => r.map(c => strong(c))).flatten(),
)

#if inv.meta.notes != "" [ #v(1.2em) #text(fill: luma(120))[#inv.meta.notes] ]
