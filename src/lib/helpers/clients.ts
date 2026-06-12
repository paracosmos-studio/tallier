import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Client, ClientContact } from "$lib/types";

/** first non-blank contact value in a list, trimmed, or null. */
export function firstContactValue(list: ClientContact[] | null): string | null {
    return list?.find((c) => c.value.trim())?.value.trim() ?? null;
}

/** single contact detail for subtext, preferring email, then mailing address, then phone. */
export function clientSubtext(c: Client): string | null {
    return firstContactValue(c.emails) ?? c.mailing_address ?? firstContactValue(c.phones);
}

const AVATAR_TYPES: readonly string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];
const AVATAR_MAX_BYTES: number = 10 * 1024 * 1024;
const AVATAR_MIN_DIM: number = 200;
const AVATAR_MAX_DIM: number = 3500;

/** `accept` value for the avatar file input. */
export const AVATAR_ACCEPT: string = AVATAR_TYPES.join(",");

/** subdirectory of the app data dir holding copied avatar files. */
const AVATAR_SUBDIR: string = "avatars";
let avatarRoot: Promise<string> | null = null;

/** Resolves a stored avatar filename to an asset-protocol URL for `<img>`. */
export async function avatarSrc(name: string): Promise<string> {
    avatarRoot ??= appDataDir();
    return convertFileSrc(await join(await avatarRoot, AVATAR_SUBDIR, name));
}

function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read the file"));
        reader.readAsDataURL(file);
    });
}

function imageSize(src: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("Invalid image"));
        img.src = src;
    });
}

/**
 * Validates an avatar file (type, size, resolution) and returns it as a data
 * URL. Throws an Error with a user-facing message when the file is rejected.
 */
export async function loadClientAvatar(file: File): Promise<string> {
    if (!AVATAR_TYPES.includes(file.type)) {
        throw new Error("Use a JPG, PNG, WEBP, or GIF image");
    }
    if (file.size > AVATAR_MAX_BYTES) {
        throw new Error("Image must be 10MB or smaller");
    }
    const dataUrl = await readDataUrl(file);
    const { w, h } = await imageSize(dataUrl);
    if (w < AVATAR_MIN_DIM || h < AVATAR_MIN_DIM) {
        throw new Error(`Image must be at least ${AVATAR_MIN_DIM}x${AVATAR_MIN_DIM}px`);
    }
    if (w > AVATAR_MAX_DIM || h > AVATAR_MAX_DIM) {
        throw new Error(`Image must be ${AVATAR_MAX_DIM}x${AVATAR_MAX_DIM}px or smaller`);
    }
    return dataUrl;
}
