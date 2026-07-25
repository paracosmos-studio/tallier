// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getDB } from "./connection";
import { deleteClientAvatar } from "$lib/helpers/clients";
import type { Profile, ClientContact } from "$lib/types";

async function storedLogo(id: number): Promise<string | null> {
    const rows = await getDB().select<{ logo: string | null }[]>(
        "SELECT logo FROM profiles WHERE id = $1",
        [id]
    );
    return rows[0]?.logo ?? null;
}

interface ProfileRow {
    id: number;
    position: number;
    label: string;
    business_name: string;
    tax_id: string | null;
    logo: string | null;
    emails: string | null;
    phones: string | null;
    mailing_address: string | null;
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

function hydrate(row: ProfileRow): Profile {
    return {
        id: row.id,
        position: row.position,
        label: row.label,
        business_name: row.business_name,
        tax_id: row.tax_id,
        logo: row.logo,
        emails: parseList(row.emails),
        phones: parseList(row.phones),
        mailing_address: row.mailing_address,
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

/** Returns all profiles ordered by position ascending. */
export async function getProfiles(): Promise<Profile[]> {
    const database = getDB();
    const rows = await database.select<ProfileRow[]>(
        "SELECT * FROM profiles ORDER BY position ASC, id ASC"
    );
    return rows.map(hydrate);
}

/** Returns a single profile by ID, or null if not found. */
export async function getProfile(id: number): Promise<Profile | null> {
    const database = getDB();
    const rows = await database.select<ProfileRow[]>(
        "SELECT * FROM profiles WHERE id = $1",
        [id]
    );
    return rows.length > 0 ? hydrate(rows[0]) : null;
}

/** Creates a new profile appended to the end of the position list. */
export async function createProfile(p: Omit<Profile, "id" | "position">): Promise<void> {
    const database = getDB();
    const rows = await database.select<{ max_pos: number | null }[]>(
        "SELECT MAX(position) as max_pos FROM profiles"
    );
    const position = (rows[0]?.max_pos ?? -1) + 1;
    await database.execute(
        `INSERT INTO profiles
            (position, label, business_name, tax_id, logo,
             emails, phones, mailing_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            position,
            p.label,
            p.business_name,
            p.tax_id,
            p.logo,
            pack(p.emails),
            pack(p.phones),
            p.mailing_address,
        ]
    );
}

/** Updates all editable fields of an existing profile (position is unchanged). */
export async function updateProfile(id: number, p: Omit<Profile, "id" | "position">): Promise<void> {
    const database = getDB();
    // drop the previously stored file when the logo is replaced or cleared
    const prev = await storedLogo(id);
    if (prev && prev !== p.logo) await deleteClientAvatar(prev);
    await database.execute(
        `UPDATE profiles
         SET label = $1,
             business_name = $2,
             tax_id = $3,
             logo = $4,
             emails = $5,
             phones = $6,
             mailing_address = $7
         WHERE id = $8`,
        [
            p.label,
            p.business_name,
            p.tax_id,
            p.logo,
            pack(p.emails),
            pack(p.phones),
            p.mailing_address,
            id,
        ]
    );
}

/** Bulk-updates position values for a list of profiles. */
export async function reorderProfiles(
    order: { id: number; position: number }[]
): Promise<void> {
    const database = getDB();
    for (const { id, position } of order) {
        await database.execute(
            "UPDATE profiles SET position = $1 WHERE id = $2",
            [position, id]
        );
    }
}

/** Deletes a profile by ID, removing its logo file if any. */
export async function deleteProfile(id: number): Promise<void> {
    const database = getDB();
    const logo = await storedLogo(id);
    await database.execute("DELETE FROM profiles WHERE id = $1", [id]);
    if (logo) await deleteClientAvatar(logo);
}
