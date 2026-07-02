// modern: sans, accent band, generous space
#let inv = json(bytes(sys.inputs.invoice))
#let accent = rgb("#2f6f4f")
#let block-addr(v) = if v == none { none } else { v.split("\n").join(linebreak()) }
#let contacts(items) = if items == none { () } else { items.map(it => it.value) }
#let lines(..items) = items.pos().filter(x => x != none and x != "").map(x => [#x]).join(linebreak())

#set document(title: "Invoice " + inv.meta.invoiceNo)
#set page(paper: "a4", margin: 2cm)
#set text(font: ("Instrument Sans", "Arial"), size: 10pt, fill: luma(35))
#set table(stroke: none, inset: 9pt)

#block(fill: accent, inset: 16pt, radius: 6pt, width: 100%, text(fill: white)[
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    [
      #if "/sender-logo" in sys.inputs {
        grid(
          columns: (auto, auto),
          column-gutter: 9pt,
          align: horizon,
          box(width: 30pt, height: 30pt, radius: 50%, clip: true, image("/sender-logo", width: 30pt, height: 30pt, fit: "cover")),
          text(size: 15pt, weight: "semibold")[#inv.sender.business_name],
        )
      } else {
        text(size: 15pt, weight: "semibold")[#inv.sender.business_name]
      }
    ],
    [
      #text(size: 24pt, weight: "bold")[INVOICE] \
      \##inv.meta.invoiceNo
    ],
  )
])

#v(1.4em)
#grid(
  columns: (1fr, 1fr),
  [
    #text(fill: accent, weight: "semibold")[BILL TO] \
    #inv.recipient.contact_name
    #if inv.recipient.company_name != none [ \ #inv.recipient.company_name ]
    #if inv.recipient.mailing_address != none [ \ #block-addr(inv.recipient.mailing_address) ]
  ],
  align(right)[
    #text(fill: accent, weight: "semibold")[FROM] \
    #lines(
      block-addr(inv.sender.mailing_address),
      ..contacts(inv.sender.emails),
      "Issued: " + inv.meta.issueDate,
      if inv.meta.dueDate != "" { "Due: " + inv.meta.dueDate },
    )
  ],
)

#v(1.4em)
#table(
  columns: inv.items.widths.map(w => w * 1fr),
  table.header(..inv.items.columns.map(c => text(fill: accent, weight: "semibold", c))),
  table.hline(stroke: 1pt + accent),
  ..inv.items.rows.flatten(),
  table.hline(stroke: 1pt + accent),
  ..inv.totals.map(r => r.map(c => strong(c))).flatten(),
)

#if inv.meta.notes != "" [ #v(1.4em) #text(fill: luma(120))[#inv.meta.notes] ]
