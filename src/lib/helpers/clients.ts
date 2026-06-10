import type { Client, ClientContact } from "$lib/types";

/** first non-blank contact value in a list, trimmed, or null. */
export function firstContactValue(list: ClientContact[] | null): string | null {
    return list?.find((c) => c.value.trim())?.value.trim() ?? null;
}

/** single contact detail for subtext, preferring email, then mailing address, then phone. */
export function clientSubtext(c: Client): string | null {
    return firstContactValue(c.emails) ?? c.mailing_address ?? firstContactValue(c.phones);
}
