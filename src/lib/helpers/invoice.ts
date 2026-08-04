// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import type { Client } from "$lib/types";

/**
 * Builds an invoice number for a client. When the client defines an invoice ID
 * prefix the number is that prefix followed by a 4-digit sequence seed;
 * otherwise a standalone 6-digit number is generated.
 */
export function generateInvoiceNo(client?: Client | null): string {
    const prefix = client?.invoice_id_prefix?.trim();
    if (prefix) return `${prefix}${1000 + Math.floor(Math.random() * 9000)}`;
    return String(100000 + Math.floor(Math.random() * 900000));
}
