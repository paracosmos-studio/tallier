// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import type { Project, ProjectLimits } from "$lib/types";


/** Returns all projects ordered by position ascending. */
export async function getProjects(): Promise<Project[]> {
    const database = getDB();
    return database.select<Project[]>(
        "SELECT * FROM projects ORDER BY position ASC"
    );
}


/** Returns a single project by ID, or null if not found. */
export async function getProject(id: number): Promise<Project | null> {
    const database = getDB();
    const rows = await database.select<Project[]>(
        "SELECT * FROM projects WHERE id = $1",
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
}


export interface ProjectExtras {
    color?: string | null;
    hourlyRate?: number | null;
    currency?: string | null;
}


/**
 * Creates a new project appended to the end of the position list.
 * @param name - display name for the project.
 * @param limits - optional timer limit config.
 * @param extras - optional swatch color, hourly rate, and currency.
 */
export async function createProject(
    name: string,
    limits?: ProjectLimits,
    extras: ProjectExtras = {}
): Promise<void> {
    const database = getDB();
    const rows = await database.select<{max_pos: number | null}[]>(
        "SELECT MAX(position) as max_pos FROM projects"
    );
    const nextPos = (rows[0]?.max_pos ?? -1) + 1;
    await database.execute(
        `INSERT INTO projects
            (name, position, color, hourly_rate, currency,
             max_daily, max_daily_alert, max_weekly, max_weekly_alert,
             max_daily_enabled, max_weekly_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
            name,
            nextPos,
            extras.color ?? null,
            extras.hourlyRate ?? null,
            extras.currency ?? null,
            limits?.maxDaily ?? null,
            limits?.maxDailyAlert ?? null,
            limits?.maxWeekly ?? null,
            limits?.maxWeeklyAlert ?? null,
            limits?.maxDailyEnabled ? 1 : 0,
            limits?.maxWeeklyEnabled ? 1 : 0,
        ]
    );
}


/**
 * Updates the display name, limits, color, hourly rate, and currency
 * of an existing project.
 * @param id - project ID.
 * @param name - new display name.
 * @param limits - timer limit config.
 * @param extras - swatch color, hourly rate, currency (null clears).
 */
export async function updateProject(
    id: number,
    name: string,
    limits?: ProjectLimits,
    extras: ProjectExtras = {}
): Promise<void> {
    const database = getDB();
    await database.execute(
        `UPDATE projects
         SET name = $1,
             color = $2,
             hourly_rate = $3,
             currency = $4,
             max_daily = $5,
             max_daily_alert = $6,
             max_weekly = $7,
             max_weekly_alert = $8,
             max_daily_enabled = $9,
             max_weekly_enabled = $10
         WHERE id = $11`,
        [
            name,
            extras.color ?? null,
            extras.hourlyRate ?? null,
            extras.currency ?? null,
            limits?.maxDaily ?? null,
            limits?.maxDailyAlert ?? null,
            limits?.maxWeekly ?? null,
            limits?.maxWeeklyAlert ?? null,
            limits?.maxDailyEnabled ? 1 : 0,
            limits?.maxWeeklyEnabled ? 1 : 0,
            id,
        ]
    );
}


/**
 * Updates only the display name of an existing project.
 * @param id - project ID.
 * @param name - new display name.
 */
export async function updateProjectName(
    id: number,
    name: string
): Promise<void> {
    const database = getDB();
    await database.execute(
        "UPDATE projects SET name = $1 WHERE id = $2",
        [name, id]
    );
}


/**
 * Bulk-updates position values for a list of projects.
 * @param order - array of `{ id, position }` pairs to apply.
 */
export async function reorderProjects(
    order: {id: number; position: number}[]
): Promise<void> {
    const database = getDB();
    for (const { id, position } of order) {
        await database.execute(
            "UPDATE projects SET position = $1 WHERE id = $2",
            [position, id]
        );
    }
}


/**
 * Deletes a project and all its associated entries.
 * @param id - project ID.
 */
export async function deleteProject(id: number): Promise<void> {
    const database = getDB();
    await database.execute(
        "DELETE FROM entries WHERE project_id = $1",
        [id]
    );
    await database.execute(
        "DELETE FROM projects WHERE id = $1",
        [id]
    );
}
