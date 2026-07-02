import { invoke } from "@tauri-apps/api/core";
import { csvEscape } from "./csv";
import { joinPath } from "./fs";
import { toInvoiceInput } from "./invoice-data";
import { toHtml } from "./invoice-html";
import type { InvoiceData } from "$lib/types";

export type InvoiceFormat = "pdf" | "html" | "csv" | "txt";

// filesystem-safe invoice number for use in a filename
function safeNo(no: string): string {
  return no.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "invoice";
}

/**
 * Builds the absolute target path an export writes to, without touching disk.
 *
 * @param location - Destination directory.
 * @param data - Assembled invoice model (its number names the file).
 * @param format - Output format, used as the extension.
 */
export function invoiceTargetPath(location: string, data: InvoiceData, format: InvoiceFormat): string {
  return joinPath(location, `invoice_${safeNo(data.meta.invoiceNo)}.${format}`);
}

/**
 * Renders the items table (columns, rows, totals) as CSV.
 *
 * @param data - Assembled invoice model.
 */
export function toCsv(data: InvoiceData): string {
  const rows = [data.items.columns, ...data.items.rows, ...data.totals];
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

// pad each column to its widest cell so text output stays aligned
function textTable(rows: string[][]): string[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, cell.length)));
  }
  return rows.map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd());
}

/**
 * Renders the invoice as a readable plain-text document.
 *
 * @param data - Assembled invoice model.
 */
export function toPlainText(data: InvoiceData): string {
  const { sender, recipient, meta, items, totals } = data;
  const out: string[] = [`INVOICE ${meta.invoiceNo}`, `Issued: ${meta.issueDate}`];
  if (meta.dueDate) out.push(`Due: ${meta.dueDate}`);
  out.push("", `From: ${sender.business_name}`);
  if (sender.mailing_address) out.push(sender.mailing_address);
  out.push("", `Bill to: ${recipient.contact_name}`);
  if (recipient.company_name) out.push(recipient.company_name);
  if (recipient.mailing_address) out.push(recipient.mailing_address);
  out.push("", ...textTable([items.columns, ...items.rows, ...totals]));
  if (meta.notes) out.push("", meta.notes);
  return out.join("\n") + "\n";
}

/**
 * Exports the invoice in the chosen format and returns the resolved path.
 * PDF compiles via the Typst engine then writes bytes; the data formats write
 * text directly. A leading `~/` in `location` is expanded server-side.
 *
 * @param data - Assembled invoice model.
 * @param templateId - Selected PDF template id (used by the PDF path only).
 * @param format - Output format.
 * @param location - Destination directory.
 */
export async function exportInvoice(
  data: InvoiceData,
  templateId: string,
  format: InvoiceFormat,
  location: string,
): Promise<string> {
  const path = invoiceTargetPath(location, data, format);
  if (format === "pdf") {
    const bytes = await invoke<number[]>("render_invoice_pdf", {
      templateId,
      data: toInvoiceInput(data),
      senderLogo: data.sender.logo,
      recipientAvatar: data.recipient.avatar,
    });
    return await invoke<string>("write_file", { path, bytes });
  }
  const contents =
    format === "csv"
      ? toCsv(data)
      : format === "txt"
        ? toPlainText(data)
        : toHtml(data, templateId, await logoDataUri(data.sender.logo));
  return await invoke<string>("write_text_file", { path, contents });
}

// resolve a stored avatar filename to an inline data URI for portable HTML;
// a missing or unreadable file degrades to no logo
async function logoDataUri(name: string | null): Promise<string | undefined> {
  if (!name) return undefined;
  try {
    return await invoke<string>("read_avatar", { name });
  } catch {
    return undefined;
  }
}
