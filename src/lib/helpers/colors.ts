// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { getSetting, setSetting } from "$lib/db";

export const PROJECT_COLORS: readonly string[] = [
    "#9ECB78",
    "#EEC675",
    "#E16470",
    "#7AAFCF",
    "#C78ADB",
    "#6CD4C5",
    "#E8A46B",
    "#A8A0D6",
];

export const APP_COLORS: readonly string[] = [
    "#8FA3E6",
    "#E8A46B",
    "#C78ADB",
    "#6CD4C5",
    "#C9C9C9",
    "#EEC675",
    "#E16470",
    "#9ECB78",
    "#A8A0D6",
    "#7AAFCF",
];

export function getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function getRandomProjectColor(): string {
    return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
}

/**
 * Builds a project-id → color map. Honors each project's stored `color` when
 * present; otherwise falls back to a palette color keyed by creation order
 * (id asc) so an unconfigured project's color follows the project across
 * reorders instead of staying glued to its list slot.
 */
export function buildProjectColorMap(
    projects: { id?: number; color?: string | null }[]
): Map<number, string> {
    const map = new Map<number, string>();
    const ordered = projects
        .filter((p) => p.id !== undefined)
        .sort((a, b) => a.id! - b.id!);
    ordered.forEach((p, i) => {
        map.set(p.id!, p.color ?? getProjectColor(i));
    });
    return map;
}

export const CUSTOM_COLORS_SETTING_KEY = "customColors";
export const MAX_CUSTOM_COLORS = 64;

/** Hue in degrees [0, 360), saturation and value in [0, 1]. */
export interface Hsv {
    h: number;
    s: number;
    v: number;
}

/**
 * Normalizes `#rgb` / `#rrggbb` input (hash optional, any case) to uppercase
 * `#RRGGBB`. Returns null for anything else.
 */
export function normalizeHex(input: string): string | null {
    const raw: string = input.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(raw)) {
        return `#${[...raw].map((c) => c + c).join("")}`.toUpperCase();
    }
    return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw}`.toUpperCase() : null;
}

/**
 * Converts a normalized `#RRGGBB` color to HSV.
 */
export function hexToHsv(hex: string): Hsv {
    const n: number = parseInt(hex.slice(1), 16);
    const r: number = ((n >> 16) & 255) / 255;
    const g: number = ((n >> 8) & 255) / 255;
    const b: number = (n & 255) / 255;
    const max: number = Math.max(r, g, b);
    const d: number = max - Math.min(r, g, b);
    let h: number = 0;
    if (d > 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
    }
    return { h: (h * 60 + 360) % 360, s: max > 0 ? d / max : 0, v: max };
}

/**
 * Converts HSV to uppercase `#RRGGBB`.
 */
export function hsvToHex({ h, s, v }: Hsv): string {
    const channel = (n: number): string => {
        const k: number = (n + h / 60) % 6;
        const c: number = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        return Math.round(c * 255).toString(16).padStart(2, "0");
    };
    return `#${channel(5)}${channel(3)}${channel(1)}`.toUpperCase();
}

/**
 * Whether dark foreground content reads better than light on `hex`, by
 * relative luminance.
 */
export function isLightColor(hex: string): boolean {
    const n: number = parseInt(hex.slice(1), 16);
    const linear = (c: number): number => {
        const v: number = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const l: number = 0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
    return l > 0.179;
}

/**
 * Loads the user's saved palette colors, dropping malformed entries.
 */
export async function getCustomColors(): Promise<string[]> {
    const raw: string | null = await getSetting(CUSTOM_COLORS_SETTING_KEY);
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const colors: string[] = parsed
            .map((c) => (typeof c === "string" ? normalizeHex(c) : null))
            .filter((c): c is string => c !== null);
        return [...new Set(colors)].slice(0, MAX_CUSTOM_COLORS);
    } catch {
        return [];
    }
}

/**
 * Persists the user's palette colors.
 */
export async function setCustomColors(colors: string[]): Promise<void> {
    await setSetting(CUSTOM_COLORS_SETTING_KEY, JSON.stringify(colors.slice(0, MAX_CUSTOM_COLORS)));
}
