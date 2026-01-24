import Database from "@tauri-apps/plugin-sql";
import type { Timer, Project, Entry } from "$lib/types";

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
    const result = await database.select<Project[]>(
        "SELECT * FROM projects ORDER BY position ASC"
    );
    return result;
}


export async function createProject(
    name: string,
    description?: string
): Promise<void> {

    const database = getDB();
    await database.execute(
        "INSERT INTO projects (name, description) VALUES ($1, $2)",
        [name, description]
    );
}

export async function updateProject(
    id: number,
    name: string,
    description?: string
): Promise<void> {

    const database = getDB();
    await database.execute(
        "UPDATE projects SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
    );
}

export async function deleteProject(id: number): Promise<void> {
    const database = getDB();
    await database.execute(
        "DELETE FROM projects WHERE id = $1",
        [id]
    );
}

// export async function getUsers(): Promise<User[]> {
//   const database = getDB();
//   const result = await database.select<User[]>(
//     "SELECT * FROM users ORDER BY created_at DESC"
//   );
//   return result;
// }

// export async function deleteUser(id: number): Promise<void> {
//   const database = getDB();
//   await database.execute(
//     "DELETE FROM users WHERE id = $1",
//     [id]
//   );
// }
