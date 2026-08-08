// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getSetting, setSetting, deleteSetting } from "$lib/db";
import { appMeta } from "$lib/helpers/export-meta";
import { settings } from "$lib/config";

export const USAGE_PING_SETTING_KEY = "sendAnonymousUsagePing";
export const USAGE_PING_ID_KEY = "anonymousPingId";
export const USAGE_PING_DAY_KEY = "lastUsagePingDay";

/**
 * Parses the stored toggle value. Opt-in: anything but "true" is off.
 */
export function parseUsagePing(value: string | null): boolean {
    return value === "true";
}

// utc day as YYYY-MM-DD, matching the server's date('now')
function utcDay(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Persists the toggle. Disabling also discards the anonymous identity, so a
 * later opt-in starts with a fresh id.
 */
export async function setUsagePingEnabled(enabled: boolean): Promise<void> {
    await setSetting(USAGE_PING_SETTING_KEY, String(enabled));
    if (!enabled) {
        await deleteSetting(USAGE_PING_ID_KEY);
        await deleteSetting(USAGE_PING_DAY_KEY);
    }
}

/**
 * Sends the opt-in anonymous daily ping: random id, app version, os. At most
 * once per utc day client-side; the server dedupes again. Silent on every
 * failure: an offline launch must not surface errors.
 */
export async function runStartupUsagePing(): Promise<void> {
    try {
        if (!parseUsagePing(await getSetting(USAGE_PING_SETTING_KEY))) return;

        const today: string = utcDay();
        if ((await getSetting(USAGE_PING_DAY_KEY)) === today) return;

        let id: string | null = await getSetting(USAGE_PING_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            await setSetting(USAGE_PING_ID_KEY, id);
        }

        const { version, os } = await appMeta();
        const res: Response = await fetch(`${settings.api}/analytics/ping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anonymous_id: id, app_version: version, os }),
            signal: AbortSignal.timeout(5000),
        });

        if (res.ok) await setSetting(USAGE_PING_DAY_KEY, today);
    } catch {
        // ignore: offline, api down, timeout
    }
}
