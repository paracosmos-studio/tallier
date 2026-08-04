// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

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
