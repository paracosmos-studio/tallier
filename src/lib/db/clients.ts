import { getDB } from "./connection";
import type { Client, ClientContact } from "$lib/types";

interface ClientRow {
    id: number;
    contact_name: string;
    company_name: string | null;
    mailing_address: string | null;
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
        contact_name: row.contact_name,
        company_name: row.company_name,
        mailing_address: row.mailing_address,
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

/** Returns all clients ordered by id ascending. */
export async function getClients(): Promise<Client[]> {
    const database = getDB();
    const rows = await database.select<ClientRow[]>(
        "SELECT * FROM clients ORDER BY id ASC"
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

/** Creates a new client. `contact_name` is required; all other fields nullable. */
export async function createClient(c: Omit<Client, "id">): Promise<void> {
    const database = getDB();
    await database.execute(
        `INSERT INTO clients
            (contact_name, company_name, mailing_address,
             emails, phones, websites, invoice_id_prefix)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            c.contact_name,
            c.company_name,
            c.mailing_address,
            pack(c.emails),
            pack(c.phones),
            pack(c.websites),
            c.invoice_id_prefix,
        ]
    );
}

/** Updates all editable fields of an existing client. */
export async function updateClient(id: number, c: Omit<Client, "id">): Promise<void> {
    const database = getDB();
    await database.execute(
        `UPDATE clients
         SET contact_name = $1,
             company_name = $2,
             mailing_address = $3,
             emails = $4,
             phones = $5,
             websites = $6,
             invoice_id_prefix = $7
         WHERE id = $8`,
        [
            c.contact_name,
            c.company_name,
            c.mailing_address,
            pack(c.emails),
            pack(c.phones),
            pack(c.websites),
            c.invoice_id_prefix,
            id,
        ]
    );
}

/** Deletes a client by ID. */
export async function deleteClient(id: number): Promise<void> {
    const database = getDB();
    await database.execute("DELETE FROM clients WHERE id = $1", [id]);
}
