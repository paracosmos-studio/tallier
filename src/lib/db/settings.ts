// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";


/**
 * Retrieves a setting value by key. Returns null if not found.
 */
export async function getSetting(key: string): Promise<string | null> {
    const rows: { value: string }[] = await getDB().select(
        "SELECT value FROM settings WHERE key = $1", [key]
    );
    return rows.length > 0 ? rows[0].value : null;
}


/**
 * Upserts a setting key-value pair.
 */
export async function setSetting(key: string, value: string): Promise<void> {
    await getDB().execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)", [key, value]
    );
}
