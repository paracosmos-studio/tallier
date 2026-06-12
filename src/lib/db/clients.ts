import { getDB } from "./connection";
import { deleteClientAvatar } from "$lib/helpers/clients";
import type { Client, ClientContact } from "$lib/types";

async function storedAvatar(id: number): Promise<string | null> {
    const rows = await getDB().select<{ avatar: string | null }[]>(
        "SELECT avatar FROM clients WHERE id = $1",
        [id]
    );
    return rows[0]?.avatar ?? null;
}

interface ClientRow {
    id: number;
    position: number;
    contact_name: string;
    company_name: string | null;
    mailing_address: string | null;
    avatar: string | null;
    emails: string | null;
    phones: string | null;
    websites: string | null;
    invoice_id_prefix: string | null;
}

function parseList(raw: string | null): ClientContact[] | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function hydrate(row: ClientRow): Client {
    return {
        id: row.id,
        position: row.position,
        contact_name: row.contact_name,
        company_name: row.company_name,
        mailing_address: row.mailing_address,
        avatar: row.avatar,
        emails: parseList(row.emails),
        phones: parseList(row.phones),
        websites: parseList(row.websites),
        invoice_id_prefix: row.invoice_id_prefix,
    };
}

// drop fully-empty rows so we don't persist `[{label:"",value:""}]`
function pack(list: ClientContact[] | null): string | null {
    if (!list) return null;
    const cleaned = list
        .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
        .filter((c) => c.label || c.value);
    return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

/** Returns all clients ordered by position ascending. */
export async function getClients(): Promise<Client[]> {
    const database = getDB();
    const rows = await database.select<ClientRow[]>(
        "SELECT * FROM clients ORDER BY position ASC, id ASC"
    );
    return rows.map(hydrate);
}

/** Returns a single client by ID, or null if not found. */
export async function getClient(id: number): Promise<Client | null> {
    const database = getDB();
    const rows = await database.select<ClientRow[]>(
        "SELECT * FROM clients WHERE id = $1",
        [id]
    );
    return rows.length > 0 ? hydrate(rows[0]) : null;
}

/** Creates a new client appended to the end of the position list. */
export async function createClient(c: Omit<Client, "id" | "position">): Promise<void> {
    const database = getDB();
    const rows = await database.select<{ max_pos: number | null }[]>(
        "SELECT MAX(position) as max_pos FROM clients"
    );
    const position = (rows[0]?.max_pos ?? -1) + 1;
    await database.execute(
        `INSERT INTO clients
            (position, contact_name, company_name, mailing_address, avatar,
             emails, phones, websites, invoice_id_prefix)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            position,
            c.contact_name,
            c.company_name,
            c.mailing_address,
            c.avatar,
            pack(c.emails),
            pack(c.phones),
            pack(c.websites),
            c.invoice_id_prefix,
        ]
    );
}

/** Updates all editable fields of an existing client (position is unchanged). */
export async function updateClient(id: number, c: Omit<Client, "id" | "position">): Promise<void> {
    const database = getDB();
    // drop the previously stored file when the avatar is replaced or cleared
    const prev = await storedAvatar(id);
    if (prev && prev !== c.avatar) await deleteClientAvatar(prev);
    await database.execute(
        `UPDATE clients
         SET contact_name = $1,
             company_name = $2,
             mailing_address = $3,
             avatar = $4,
             emails = $5,
             phones = $6,
             websites = $7,
             invoice_id_prefix = $8
         WHERE id = $9`,
        [
            c.contact_name,
            c.company_name,
            c.mailing_address,
            c.avatar,
            pack(c.emails),
            pack(c.phones),
            pack(c.websites),
            c.invoice_id_prefix,
            id,
        ]
    );
}

/** Bulk-updates position values for a list of clients. */
export async function reorderClients(
    order: { id: number; position: number }[]
): Promise<void> {
    const database = getDB();
    for (const { id, position } of order) {
        await database.execute(
            "UPDATE clients SET position = $1 WHERE id = $2",
            [position, id]
        );
    }
}

/** Deletes a client by ID, removing its avatar file if any. */
export async function deleteClient(id: number): Promise<void> {
    const database = getDB();
    const avatar = await storedAvatar(id);
    await database.execute("DELETE FROM clients WHERE id = $1", [id]);
    if (avatar) await deleteClientAvatar(avatar);
}
