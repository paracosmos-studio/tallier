const PROJECT_COLORS = [
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

export function buildProjectColorMap(
    projects: { id?: number; position: number }[]
): Map<number, string> {
    const map = new Map<number, string>();
    const sorted = [...projects].sort((a, b) => a.position - b.position);
    sorted.forEach((p, i) => {
        if (p.id !== undefined) map.set(p.id, getProjectColor(i));
    });
    return map;
}
