import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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

// single source of truth for allowed avatar types, mapped to the extension
// used on disk. drives both the file picker and validation.
const AVATAR_MIME_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
};
const AVATAR_MAX_BYTES: number = 10 * 1024 * 1024;
const AVATAR_MIN_DIM: number = 200;
const AVATAR_MAX_DIM: number = 3500;

/** `accept` value for the avatar file input. */
export const AVATAR_ACCEPT: string = Object.keys(AVATAR_MIME_EXT).join(",");

/** subdirectory of the app data dir holding copied avatar files. */
const AVATAR_SUBDIR: string = "avatars";
let avatarRoot: Promise<string> | null = null;

/** resolves a stored avatar filename to an asset-protocol URL for `<img>`. */
export async function avatarSrc(name: string): Promise<string> {
    avatarRoot ??= appDataDir();
    return convertFileSrc(await join(await avatarRoot, AVATAR_SUBDIR, name));
}

// natural dimensions via a transient object URL (never a base64 data URL)
function imageSize(file: File): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Invalid image"));
        };
        img.src = url;
    });
}

/**
 * validates an avatar file (type, size, resolution), copies it into the app
 * data dir, and returns the stored filename. Throws an Error with a user-facing
 * message when the file is rejected.
 */
export async function saveClientAvatar(file: File): Promise<string> {
    const ext = AVATAR_MIME_EXT[file.type];
    if (!ext) {
        throw new Error("Use a JPG or PNG image");
    }
    if (file.size > AVATAR_MAX_BYTES) {
        throw new Error("Image must be 10MB or smaller");
    }
    const { w, h } = await imageSize(file);
    if (w < AVATAR_MIN_DIM || h < AVATAR_MIN_DIM) {
        throw new Error(`Image must be at least ${AVATAR_MIN_DIM}x${AVATAR_MIN_DIM}px`);
    }
    if (w > AVATAR_MAX_DIM || h > AVATAR_MAX_DIM) {
        throw new Error(`Image must be ${AVATAR_MAX_DIM}x${AVATAR_MAX_DIM}px or smaller`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return await invoke<string>("save_avatar", { bytes, ext });
}

/** removes a stored avatar file by name (best-effort, never throws). */
export async function deleteClientAvatar(name: string): Promise<void> {
    await invoke("delete_avatar", { name }).catch(() => {});
}
