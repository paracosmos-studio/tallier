import type { TableColumn, TableRow } from "$lib/components/table.svelte";
import type { Client, InvoiceData, InvoiceMeta, Profile } from "$lib/types";

type Snapshot = { columns: TableColumn[]; rows: TableRow[] };

/**
 * Splits a table snapshot into the canonical invoice model.
 *
 * `rows[0]` is always the column-header row; `kind === "data"` rows are line
 * items; any `kind === "header"` rows after index 0 are totals rows. Cells stay
 * as pre-formatted strings - templates do layout only, never re-format.
 *
 * @param sender - Sender identity profile.
 * @param recipient - Invoice recipient client.
 * @param meta - Invoice number, dates and notes from the Details step.
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
    meta,
    items: {
      columns,
      rows: body.filter((r) => r.kind === "data").map((r) => r.cells),
    },
    totals: body.filter((r) => r.kind === "header").map((r) => r.cells),
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
