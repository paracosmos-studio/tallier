import type { InvoiceData } from "$lib/types";
import type { ExportStamp } from "../export-meta";
import { classicHtml } from "./classic.html";
import { modernHtml } from "./modern.html";
import { minimalHtml } from "./minimal.html";
import { defaultHtml } from "./default.html";
import { studioHtml } from "./studio.html";
import { slateHtml } from "./slate.html";
import { terminalHtml } from "./terminal.html";
import { compactHtml } from "./compact.html";
import { softHtml } from "./soft.html";

type Renderer = (data: InvoiceData, logo?: string, stamp?: ExportStamp, avatar?: string) => string;

const RENDERERS: Record<string, Renderer> = {
  default: defaultHtml,
  classic: classicHtml,
  modern: modernHtml,
  minimal: minimalHtml,
  studio: studioHtml,
  slate: slateHtml,
  terminal: terminalHtml,
  compact: compactHtml,
  soft: softHtml,
};

/**
 * Renders the invoice as standalone HTML in the selected template's style,
 * falling back to the classic layout for an unknown id.
 *
 * @param data - Assembled invoice model.
 * @param templateId - Selected template id.
 * @param logo - Sender logo as a data URI, embedded inline when present.
 * @param stamp - Provenance stamp, embedded as head metadata when provided.
 * @param avatar - Recipient avatar as a data URI, used by designs that render it.
 */
export function toHtml(
  data: InvoiceData,
  templateId: string,
  logo?: string,
  stamp?: ExportStamp,
  avatar?: string,
): string {
  return (RENDERERS[templateId] ?? classicHtml)(data, logo, stamp, avatar);
}
