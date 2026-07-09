// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import type { Entry } from "$lib/types";


/**
 * Creates a new time entry linking a timer to a project.
 * @param timerId - ID of the associated timer.
 * @param projectId - ID of the associated project.
 * @param title - optional title for the entry.
 * @param summary - optional summary/notes for the entry.
 * @returns the ID of the newly created entry.
 */
export async function createEntry(
    timerId: number,
    projectId: number,
    title?: string,
    summary?: string
): Promise<number> {
    const database = getDB();
    const result = await database.execute(
        "INSERT INTO entries (timer_id, project_id, title, summary, created_at) VALUES ($1, $2, $3, $4, datetime('now'))",
        [timerId, projectId, title ?? null, summary ?? null]
    );
    return result.lastInsertId as number;
}


/**
 * Updates title, summary, and billable flag on an existing entry by timer ID.
 * @param timerId - ID of the associated timer.
 * @param title - title for the entry.
 * @param summary - summary/notes for the entry.
 * @param isBillable - whether the entry counts toward invoices.
 */
export async function updateEntrySummary(
    timerId: number,
    title: string,
    summary: string,
    isBillable: boolean
): Promise<void> {
    const database = getDB();
    await database.execute(
        "UPDATE entries SET title = $1, summary = $2, is_billable = $3 WHERE timer_id = $4",
        [title || null, summary || null, isBillable ? 1 : 0, timerId]
    );
}


/**
 * Updates only the billable flag on an existing entry by timer ID.
 * @param timerId - ID of the associated timer.
 * @param isBillable - whether the entry counts toward invoices.
 */
export async function updateEntryBillable(
    timerId: number,
    isBillable: boolean
): Promise<void> {
    const database = getDB();
    await database.execute(
        "UPDATE entries SET is_billable = $1 WHERE timer_id = $2",
        [isBillable ? 1 : 0, timerId]
    );
}


/**
 * Gets the entry associated with a specific timer.
 * @param timerId - ID of the timer to find an entry for.
 */
export async function getEntryByTimerId(timerId: number): Promise<Entry | null> {
    const database = getDB();
    const rows = await database.select<Entry[]>(
        "SELECT * FROM entries WHERE timer_id = $1 LIMIT 1",
        [timerId]
    );
    return rows.length > 0 ? rows[0] : null;
}


/**
 * Gets all entries, optionally filtered by project.
 * @param projectId - if provided, only entries for this project are returned.
 */
export async function getEntries(projectId?: number): Promise<Entry[]> {
    const database = getDB();
    if (projectId !== undefined) {
        return database.select<Entry[]>(
            "SELECT * FROM entries WHERE project_id = $1",
            [projectId]
        );
    }
    return database.select<Entry[]>("SELECT * FROM entries");
}
