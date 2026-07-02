import type { TableColumn, TableRow } from "$lib/components/table.svelte";
import type { Client, InvoiceData, InvoiceMeta, Profile } from "$lib/types";
import { formatDateMedium } from "./format";

type Snapshot = { columns: TableColumn[]; rows: TableRow[] };

/**
 * Splits a table snapshot into the canonical invoice model.
 *
 * `rows[0]` is always the column-header row; the remaining rows keep their
 * editor order and kind (`header` rows are sub-section or totals bands). Cells
 * stay as pre-formatted strings - templates do layout only, never re-format.
 * The ISO meta dates are formatted for display here, once, for the same reason.
 *
 * @param sender - Sender identity profile.
 * @param recipient - Invoice recipient client.
 * @param meta - Invoice number, ISO dates and notes from the Details step.
 * @param snapshot - Latest live state emitted by the items `Table`.
 */
export function assembleInvoice(
  sender: Profile,
  recipient: Client,
  meta: InvoiceMeta,
  snapshot: Snapshot,
): InvoiceData {
  const columns: string[] = snapshot.columns.map((_, i) => snapshot.rows[0]?.cells[i] ?? "");
  const body: TableRow[] = snapshot.rows.slice(1);
  return {
    sender,
    recipient,
    meta: {
      ...meta,
      issueDate: formatDateMedium(meta.issueDate),
      dueDate: meta.dueDate ? formatDateMedium(meta.dueDate) : "",
    },
    items: {
      columns,
      widths: snapshot.columns.map((c) => c.width),
      rows: body.map((r) => ({ kind: r.kind, cells: r.cells })),
    },
  };
}

/**
 * Serializes `InvoiceData` to the JSON injected into the Typst world.
 *
 * Logo/avatar filenames are stripped - the Rust side resolves them to bytes and
 * registers them as virtual files, so they never travel in the payload.
 *
 * @param data - Assembled invoice model.
 */
export function toInvoiceInput(data: InvoiceData): string {
  const { logo: _logo, ...sender } = data.sender;
  const { avatar: _avatar, ...recipient } = data.recipient;
  return JSON.stringify({ ...data, sender, recipient });
}
