import type { ClientContact } from "$lib/types";

/** first non-blank contact value in a list, trimmed, or null. */
export function firstContactValue(list: ClientContact[] | null): string | null {
    return list?.find((c) => c.value.trim())?.value.trim() ?? null;
}
