import Database from "@tauri-apps/plugin-sql";
import type { Project } from "$lib/types";

let db: Database | null = null;


export async function initDB(): Promise<Database> {
    if (db) return db;
    db = await Database.load("sqlite:tally.db");
    return db;
}


export function getDB(): Database {
    if (!db) throw new Error(
        "Database not initialized. Call initDB() first."
    );
    return db;
}


export async function getProjects(): Promise<Project[]> {
    const database = getDB();
    return database.select<Project[]>(
        "SELECT * FROM projects ORDER BY position ASC"
    );
}


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
