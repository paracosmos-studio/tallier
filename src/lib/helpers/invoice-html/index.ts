import type { InvoiceData } from "$lib/types";
import { classicHtml } from "./classic.html";
import { modernHtml } from "./modern.html";
import { minimalHtml } from "./minimal.html";
import { defaultHtml } from "./default.html";

const RENDERERS: Record<string, (data: InvoiceData, logo?: string) => string> = {
  default: defaultHtml,
  classic: classicHtml,
  modern: modernHtml,
  minimal: minimalHtml,
};

/**
 * Renders the invoice as standalone HTML in the selected template's style,
 * falling back to the classic layout for an unknown id.
 *
 * @param data - Assembled invoice model.
 * @param templateId - Selected template id.
 * @param logo - Sender logo as a data URI, embedded inline when present.
 */
export function toHtml(data: InvoiceData, templateId: string, logo?: string): string {
  return (RENDERERS[templateId] ?? classicHtml)(data, logo);
}
