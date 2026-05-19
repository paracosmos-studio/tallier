import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;


/**
 * Initializes the SQLite database connection. Returns the existing instance if already loaded.
 */
export async function initDB(): Promise<Database> {
    if (db) return db;
    db = await Database.load("sqlite:tallier.db");
    return db;
}


/**
 * Returns the active database instance.
 * @throws {Error} if `initDB()` has not been called.
 */
export function getDB(): Database {
    if (!db) throw new Error(
        "Database not initialized. Call initDB() first."
    );
    return db;
}
