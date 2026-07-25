// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import { computeDuration } from "$lib/helpers/format";
import { splitCrossMidnight } from "$lib/helpers/cross-midnight";
import type { ReportEntry, DailyProjectTotal, ProjectTotal } from "$lib/types";


/**
 * Gets all entries with joined timer and project data for a date range.
 * @param startDate - start of range (YYYY-MM-DD).
 * @param endDate - end of range (YYYY-MM-DD).
 */
export async function getReportEntries(
    startDate: string,
    endDate: string
): Promise<ReportEntry[]> {
    const database = getDB();

    // widen the lower bound by one day so a session that started the
    // day before `startDate` and crossed into it is still picked up.
    const lower: Date = new Date(startDate + "T00:00:00");
    lower.setDate(lower.getDate() - 1);
    const lowerISO: string = `${lower.getFullYear()}-${String(lower.getMonth() + 1).padStart(2, "0")}-${String(lower.getDate()).padStart(2, "0")}`;

    const rows = await database.select<ReportEntry[]>(
        `SELECT e.id as entry_id, e.timer_id, e.project_id, p.name as project_name,
                e.title, e.summary, e.is_billable, t.date, t.start, t.end, t.total
         FROM entries e
         JOIN timers t ON t.id = e.timer_id
         JOIN projects p ON p.id = e.project_id
         WHERE t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2
         ORDER BY t.date DESC, t.start DESC`,
        [lowerISO, endDate]
    );

    const split: ReportEntry[] = splitCrossMidnight(rows);

    return split
        .filter(r => r.date >= startDate && r.date <= endDate)
        .sort((a, b) => {
            if (a.date !== b.date) return a.date < b.date ? 1 : -1;
            return a.start < b.start ? 1 : -1;
        });
}


/**
 * Gets per-day per-project aggregated totals for the stacked bar chart.
 * @param startDate - start of range (YYYY-MM-DD).
 * @param endDate - end of range (YYYY-MM-DD).
 */
export async function getDailyProjectTotals(
    startDate: string,
    endDate: string
): Promise<DailyProjectTotal[]> {
    const database = getDB();
    const lower: Date = new Date(startDate + "T00:00:00");
    lower.setDate(lower.getDate() - 1);
    const lowerISO: string = `${lower.getFullYear()}-${String(lower.getMonth() + 1).padStart(2, "0")}-${String(lower.getDate()).padStart(2, "0")}`;

    const rows = await database.select<ReportEntry[]>(
        `SELECT e.id as entry_id, e.timer_id, e.project_id, p.name as project_name,
                e.title, e.summary, e.is_billable, t.date, t.start, t.end, t.total
         FROM entries e
         JOIN timers t ON t.id = e.timer_id
         JOIN projects p ON p.id = e.project_id
         WHERE t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2`,
        [lowerISO, endDate]
    );

    const split: ReportEntry[] = splitCrossMidnight(rows);
    const acc: Map<string, DailyProjectTotal> = new Map();

    for (const r of split) {
        if (r.date < startDate || r.date > endDate) continue;
        const key: string = `${r.date}|${r.project_id}`;
        const cur: DailyProjectTotal | undefined = acc.get(key);
        if (cur) {
            cur.total_seconds += r.total;
        } else {
            acc.set(key, {
                date: r.date,
                project_id: r.project_id,
                project_name: r.project_name,
                total_seconds: r.total,
            });
        }
    }

    return Array.from(acc.values()).sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );
}


/**
 * Gets per-project aggregated totals for the project breakdown.
 * @param startDate - start of range (YYYY-MM-DD).
 * @param endDate - end of range (YYYY-MM-DD).
 */
export async function getProjectTotals(
    startDate: string,
    endDate: string
): Promise<ProjectTotal[]> {
    const database = getDB();
    return database.select<ProjectTotal[]>(
        `SELECT e.project_id, p.name as project_name,
                SUM(t.total) as total_seconds
         FROM entries e
         JOIN timers t ON t.id = e.timer_id
         JOIN projects p ON p.id = e.project_id
         WHERE t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2
         GROUP BY e.project_id
         ORDER BY total_seconds DESC`,
        [startDate, endDate]
    );
}


/**
 * Updates an entry's project, title, summary, billable flag, and records the edit reason.
 * @param entryId - ID of the entry to update.
 * @param projectId - new project ID.
 * @param title - new title (nullable).
 * @param summary - new summary (nullable).
 * @param reason - reason for the edit (nullable).
 * @param isBillable - whether the entry counts toward invoices.
 */
export async function updateEntry(
    entryId: number,
    projectId: number,
    title: string | null,
    summary: string | null,
    reason: string | null,
    isBillable: boolean
): Promise<void> {
    const database = getDB();
    await database.execute(
        `UPDATE entries SET project_id = $1, title = $2, summary = $3, is_billable = $4,
         updated_at = datetime('now'), updated_reason = $5 WHERE id = $6`,
        [projectId, title, summary, isBillable ? 1 : 0, reason, entryId]
    );
}


/**
 * Deletes an entry and its associated timer.
 * @param entryId - ID of the entry to delete.
 * @param timerId - ID of the associated timer to delete.
 */
export async function deleteEntry(
    entryId: number,
    timerId: number
): Promise<void> {
    const database = getDB();
    await database.execute("DELETE FROM entries WHERE id = $1", [entryId]);
    await database.execute("DELETE FROM timers WHERE id = $1", [timerId]);
}


/**
 * Creates a manual entry: inserts a stopped timer + linked entry in one shot.
 * @param projectId - project to associate the entry with.
 * @param date - date of the entry (YYYY-MM-DD).
 * @param start - start time (HH:MM:SS).
 * @param end - end time (HH:MM:SS).
 * @param title - optional title.
 * @param summary - optional summary.
 * @param isBillable - whether the entry counts toward invoices.
 */
export async function createManualEntry(
    projectId: number,
    date: string,
    start: string,
    end: string,
    title: string | null,
    summary: string | null,
    isBillable: boolean,
): Promise<void> {
    const database = getDB();
    const total: number = computeDuration(start, end);

    const timerResult = await database.execute(
        "INSERT INTO timers (status, date, start, \"end\", total) VALUES ($1, $2, $3, $4, $5)",
        ["stopped", date, start, end, total]
    );
    const timerId = timerResult.lastInsertId as number;

    await database.execute(
        "INSERT INTO entries (timer_id, project_id, title, summary, is_billable, created_at) VALUES ($1, $2, $3, $4, $5, datetime('now'))",
        [timerId, projectId, title, summary, isBillable ? 1 : 0]
    );
}


/**
 * Updates a timer's start/end times and recalculates the total.
 * @param timerId - ID of the timer to update.
 * @param start - new start time (HH:MM:SS).
 * @param end - new end time (HH:MM:SS).
 */
export async function updateEntryTimes(
    timerId: number,
    date: string,
    start: string,
    end: string
): Promise<void> {
    const database = getDB();
    const total: number = computeDuration(start, end);

    await database.execute(
        "UPDATE timers SET date = $1, start = $2, \"end\" = $3, total = $4 WHERE id = $5",
        [date, start, end, total, timerId]
    );
}
