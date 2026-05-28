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
 * present; otherwise falls back to a position-based assignment from the preset
 * palette so unconfigured projects still get stable colors.
 */
export function buildProjectColorMap(
    projects: { id?: number; position: number; color?: string | null }[]
): Map<number, string> {
    const map = new Map<number, string>();
    const sorted = [...projects].sort((a, b) => a.position - b.position);
    sorted.forEach((p, i) => {
        if (p.id === undefined) return;
        map.set(p.id, p.color ?? getProjectColor(i));
    });
    return map;
}
