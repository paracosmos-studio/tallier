// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import { formatDateISO } from "$lib/helpers/format";
import type { AppUsageRow } from "$lib/types";


/**
 * Gets the active foreground-app segments of every stopped timer in a date
 * range, joined with the timer window the readers clip against. The lower
 * bound is widened by a day so a timer that crossed midnight into the range
 * is included. Open segments report their last heartbeat as the end.
 * @param startDate - start of range (YYYY-MM-DD).
 * @param endDate - end of range (YYYY-MM-DD).
 */
export async function getAppUsageRows(
    startDate: string,
    endDate: string
): Promise<AppUsageRow[]> {
    const database = getDB();
    const lower: Date = new Date(startDate + "T00:00:00");
    lower.setDate(lower.getDate() - 1);

    return database.select<AppUsageRow[]>(
        `SELECT u.timer_id, u.app_id, u.app_name, u.started_at,
                COALESCE(u.ended_at, u.last_seen_at) AS ended_at,
                t.date, t.start, t.end
         FROM app_usage u
         JOIN timers t ON t.id = u.timer_id
         WHERE u.kind = 'active'
           AND t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2
         ORDER BY u.started_at`,
        [formatDateISO(lower), endDate]
    );
}


/**
 * Deletes every segment one app recorded under a timer, removing the app
 * from the entry's usage; the time it covered becomes untracked.
 * @param timerId - timer the segments belong to.
 * @param appId - app identifier (bundle id or executable path).
 */
export async function deleteAppUsage(timerId: number, appId: string): Promise<void> {
    const database = getDB();
    await database.execute(
        "DELETE FROM app_usage WHERE timer_id = $1 AND app_id = $2",
        [timerId, appId]
    );
}
