import { getDB } from "./connection";
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
    return database.select<ReportEntry[]>(
        `SELECT e.id as entry_id, e.timer_id, e.project_id, p.name as project_name,
                e.title, e.summary, t.date, t.start, t.end, t.total
         FROM entries e
         JOIN timers t ON t.id = e.timer_id
         JOIN projects p ON p.id = e.project_id
         WHERE t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2
         ORDER BY t.date DESC, t.start DESC`,
        [startDate, endDate]
    );
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
    return database.select<DailyProjectTotal[]>(
        `SELECT t.date, e.project_id, p.name as project_name,
                SUM(t.total) as total_seconds
         FROM entries e
         JOIN timers t ON t.id = e.timer_id
         JOIN projects p ON p.id = e.project_id
         WHERE t.status = 'stopped'
           AND t.date >= $1 AND t.date <= $2
         GROUP BY t.date, e.project_id
         ORDER BY t.date ASC`,
        [startDate, endDate]
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
 * Updates an entry's project, title, summary, and records the edit reason.
 * @param entryId - ID of the entry to update.
 * @param projectId - new project ID.
 * @param title - new title (nullable).
 * @param summary - new summary (nullable).
 * @param reason - reason for the edit (nullable).
 */
export async function updateEntry(
    entryId: number,
    projectId: number,
    title: string | null,
    summary: string | null,
    reason: string | null
): Promise<void> {
    const database = getDB();
    await database.execute(
        `UPDATE entries SET project_id = $1, title = $2, summary = $3,
         updated_at = datetime('now'), updated_reason = $4 WHERE id = $5`,
        [projectId, title, summary, reason, entryId]
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
 */
export async function createManualEntry(
    projectId: number,
    date: string,
    start: string,
    end: string,
    title: string | null,
    summary: string | null,
): Promise<void> {
    const database = getDB();
    const [sh, sm, ss] = start.split(":").map(Number);
    const [eh, em, es] = end.split(":").map(Number);
    const total = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);

    const timerResult = await database.execute(
        "INSERT INTO timers (status, date, start, \"end\", total) VALUES ($1, $2, $3, $4, $5)",
        ["stopped", date, start, end, Math.max(0, total)]
    );
    const timerId = timerResult.lastInsertId as number;

    await database.execute(
        "INSERT INTO entries (timer_id, project_id, title, summary, created_at) VALUES ($1, $2, $3, $4, datetime('now'))",
        [timerId, projectId, title, summary]
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
    start: string,
    end: string
): Promise<void> {
    const database = getDB();
    const [sh, sm, ss] = start.split(":").map(Number);
    const [eh, em, es] = end.split(":").map(Number);
    const total = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);

    await database.execute(
        "UPDATE timers SET start = $1, \"end\" = $2, total = $3 WHERE id = $4",
        [start, end, Math.max(0, total), timerId]
    );
}
