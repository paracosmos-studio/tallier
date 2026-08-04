// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import { startOfWeek, endOfWeek } from "$lib/helpers/date-utils";
import type { Timer } from "$lib/types";

function fmtISODate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


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
    const today = fmtISODate(new Date());
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
 * @param weekStartsOn - 0..6 (Sun..Sat); anchors the 7-day window.
 */
export async function getProjectTotalsForLimits(weekStartsOn: number): Promise<Map<number, { today: number; week: number }>> {
    const database = getDB();
    const now = new Date();
    const today = fmtISODate(now);
    const weekStart = startOfWeek(now, weekStartsOn);
    const weekEnd = endOfWeek(now, weekStartsOn);

    const rows = await database.select<{ project_id: number; today_seconds: number; week_seconds: number }[]>(
        `SELECT e.project_id,
                COALESCE(SUM(CASE WHEN t.date = $1 THEN t.total ELSE 0 END), 0) AS today_seconds,
                COALESCE(SUM(t.total), 0) AS week_seconds
         FROM timers t
         JOIN entries e ON e.timer_id = t.id
         WHERE t.date >= $2 AND t.date <= $3 AND t.status = 'stopped'
         GROUP BY e.project_id`,
        [today, fmtISODate(weekStart), fmtISODate(weekEnd)]
    );

    const totals = new Map<number, { today: number; week: number }>();
    for (const r of rows) {
        totals.set(r.project_id, { today: r.today_seconds, week: r.week_seconds });
    }
    return totals;
}


/**
 * Gets the total seconds logged for a project this week (stopped timers only).
 * Week boundaries are anchored by `weekStartsOn` (0..6, Sun..Sat).
 * @param projectId - ID of the project to calculate total for.
 * @param weekStartsOn - 0..6 (Sun..Sat); anchors the 7-day window.
 */
export async function getWeekProjectTotal(projectId: number, weekStartsOn: number): Promise<number> {
    const database = getDB();
    const now = new Date();
    const weekStart = startOfWeek(now, weekStartsOn);
    const weekEnd = endOfWeek(now, weekStartsOn);

    const rows = await database.select<{ total_seconds: number }[]>(
        `SELECT COALESCE(SUM(t.total), 0) as total_seconds
         FROM timers t
         JOIN entries e ON e.timer_id = t.id
         WHERE e.project_id = $1
           AND t.date >= $2
           AND t.date <= $3
           AND t.status = 'stopped'`,
        [projectId, fmtISODate(weekStart), fmtISODate(weekEnd)]
    );
    return rows[0]?.total_seconds ?? 0;
}
