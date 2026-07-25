// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

/**
 * Escapes a value for CSV: wraps in quotes and doubles inner quotes when it
 * contains a comma, quote or newline; null/undefined become an empty field.
 *
 * @param value - The cell value to escape.
 */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
