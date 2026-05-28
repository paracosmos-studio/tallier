import { getDB } from "./connection";
import type { Timer } from "$lib/types";


/**
 * Starts a new timer and returns its ID.
 * Inserts a row with status 'running', the current date/time, and total = 0.
 */
export async function startTimer(): Promise<number> {
    const database = getDB();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const time = now.toTimeString().split(" ")[0];

    const result = await database.execute(
        "INSERT INTO timers (status, date, start, total) VALUES ($1, $2, $3, $4)",
        ["running", date, time, 0]
    );
    return result.lastInsertId as number;
}


/**
 * Stops a running timer by ID.
 * Sets the end time, calculates the total elapsed seconds, and updates status.
 * @param timerId - ID of the timer to stop.
 * @param endAt - Optional explicit end time; defaults to now. Used by auto-pause to clamp to pre-sleep timestamp.
 */
export async function stopTimer(timerId: number, endAt?: Date): Promise<void> {
    const database = getDB();
    const end = endAt ?? new Date();
    const endTime = end.toTimeString().split(" ")[0];

    const rows = await database.select<Timer[]>(
        "SELECT * FROM timers WHERE id = $1",
        [timerId]
    );

    if (rows.length === 0) {
        throw new Error(`Timer with id ${timerId} not found`);
    }

    const timer = rows[0];
    const startDate = new Date(`${timer.date}T${timer.start}`);
    const totalSeconds = Math.max(0, Math.floor((end.getTime() - startDate.getTime()) / 1000));

    await database.execute(
        "UPDATE timers SET status = $1, \"end\" = $2, total = $3 WHERE id = $4",
        ["stopped", endTime, totalSeconds, timerId]
    );
}


/**
 * Gets the currently running timer, if any.
 */
export async function getRunningTimer(): Promise<Timer | null> {
    const database = getDB();
    const rows = await database.select<Timer[]>(
        "SELECT * FROM timers WHERE status = 'running' LIMIT 1"
    );
    return rows.length > 0 ? rows[0] : null;
}


/**
 * Gets the total seconds logged for a project today (stopped timers only).
 * @param projectId - ID of the project to calculate total for.
 */
export async function getTodayProjectTotal(projectId: number): Promise<number> {
    const database = getDB();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const rows = await database.select<{ total_seconds: number }[]>(
        `SELECT COALESCE(SUM(t.total), 0) as total_seconds
         FROM timers t
         JOIN entries e ON e.timer_id = t.id
         WHERE e.project_id = $1
           AND t.date = $2
           AND t.status = 'stopped'`,
        [projectId, today]
    );
    return rows[0]?.total_seconds ?? 0;
}


/**
 * Returns today + this-week totals for every project in one round-trip.
 * Map key is project_id; value carries both periods in seconds.
 */
export async function getProjectTotalsForLimits(): Promise<Map<number, { today: number; week: number }>> {
    const database = getDB();
    const now = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = fmt(now);
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const rows = await database.select<{ project_id: number; today_seconds: number; week_seconds: number }[]>(
        `SELECT e.project_id,
                COALESCE(SUM(CASE WHEN t.date = $1 THEN t.total ELSE 0 END), 0) AS today_seconds,
                COALESCE(SUM(t.total), 0) AS week_seconds
         FROM timers t
         JOIN entries e ON e.timer_id = t.id
         WHERE t.date >= $2 AND t.date <= $3 AND t.status = 'stopped'
         GROUP BY e.project_id`,
        [today, fmt(monday), fmt(sunday)]
    );

    const totals = new Map<number, { today: number; week: number }>();
    for (const r of rows) {
        totals.set(r.project_id, { today: r.today_seconds, week: r.week_seconds });
    }
    return totals;
}


/**
 * Gets the total seconds logged for a project this week (Mon-Sun, stopped timers only).
 * @param projectId - ID of the project to calculate total for.
 */
export async function getWeekProjectTotal(projectId: number): Promise<number> {
    const database = getDB();
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const rows = await database.select<{ total_seconds: number }[]>(
        `SELECT COALESCE(SUM(t.total), 0) as total_seconds
         FROM timers t
         JOIN entries e ON e.timer_id = t.id
         WHERE e.project_id = $1
           AND t.date >= $2
           AND t.date <= $3
           AND t.status = 'stopped'`,
        [projectId, fmt(monday), fmt(sunday)]
    );
    return rows[0]?.total_seconds ?? 0;
}
