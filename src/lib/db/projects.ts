import { getDB } from "./connection";
import type { Project } from "$lib/types";


/** Returns all projects ordered by position ascending. */
export async function getProjects(): Promise<Project[]> {
    const database = getDB();
    return database.select<Project[]>(
        "SELECT * FROM projects ORDER BY position ASC"
    );
}


/**
 * Creates a new project appended to the end of the position list.
 * @param name - display name for the project.
 */
export async function createProject(name: string): Promise<void> {
    const database = getDB();
    const rows = await database.select<{max_pos: number | null}[]>(
        "SELECT MAX(position) as max_pos FROM projects"
    );
    const nextPos = (rows[0]?.max_pos ?? -1) + 1;
    await database.execute(
        "INSERT INTO projects (name, position) VALUES ($1, $2)",
        [name, nextPos]
    );
}


/**
 * Updates the display name of an existing project.
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
