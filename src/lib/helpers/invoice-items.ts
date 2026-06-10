import { roundSeconds, formatDateMedium } from "./format";
import type { ReportEntry, Project } from "$lib/types";
import type { TableInit, TableInitRow } from "$lib/components/table.svelte";

export type InvoiceItemOptions = {
    cumulativeOnly: boolean;
    includeTitles: boolean;
    includeSummaries: boolean;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;
const fmt = (n: number): string => n.toFixed(2);
const hoursOf = (seconds: number): number => round2(seconds / 3600);

/**
 * Builds a `TableInit` of invoice line items from report entries.
 *
 * Each entry's duration is rounded to `roundMinutes` (billing-style) before
 * being converted to hours. Money values are computed from the project's
 * hourly rate; entries on a project with no rate leave Rate/Total blank. A
 * trailing header row sums the numeric columns. Column sums use the same
 * 2-decimal values shown per row, so the displayed figures always add up.
 *
 * @param entries - Report entries already filtered to the chosen projects/range.
 * @param projects - All projects, used to resolve hourly rates.
 * @param roundMinutes - Rounding step in minutes (<=1 means no rounding).
 * @param opts - Shaping options from the generate dialog.
 */
export function buildInvoiceItems(
    entries: ReportEntry[],
    projects: Project[],
    roundMinutes: number,
    opts: InvoiceItemOptions,
): TableInit {
    const rateById = new Map<number, number | null>();
    for (const p of projects) if (p.id != null) rateById.set(p.id, p.hourly_rate);

    let totalHours = 0;
    let totalMoney = 0;
    let hasMoney = false;

    const lineMoney = (projectId: number, hours: number): number | null => {
        const rate = rateById.get(projectId) ?? null;
        if (rate == null) return null;
        return round2(hours * rate);
    };
    const rateCell = (projectId: number): string => {
        const rate = rateById.get(projectId) ?? null;
        return rate == null ? "" : fmt(rate);
    };

    if (opts.cumulativeOnly) {
        const columns = [
            { header: "Date", width: 1.4 },
            { header: "Project", width: 1.4 },
            { header: "Hours", width: 1 },
            { header: "Rate", width: 1 },
            { header: "Total", width: 1 },
        ];

        // sum rounded seconds per (date, project)
        const groups = new Map<string, { date: string; projectId: number; name: string; seconds: number }>();
        for (const e of entries) {
            const key = `${e.date}|${e.project_id}`;
            let g = groups.get(key);
            if (!g) {
                g = { date: e.date, projectId: e.project_id, name: e.project_name, seconds: 0 };
                groups.set(key, g);
            }
            g.seconds += roundSeconds(e.total, roundMinutes);
        }

        const sorted = [...groups.values()].sort((a, b) =>
            a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date),
        );

        const rows: TableInitRow[] = sorted.map((g) => {
            const hours = hoursOf(g.seconds);
            const money = lineMoney(g.projectId, hours);
            totalHours += hours;
            if (money != null) {
                totalMoney += money;
                hasMoney = true;
            }
            return {
                cells: [
                    formatDateMedium(g.date),
                    g.name,
                    fmt(hours),
                    rateCell(g.projectId),
                    money == null ? "" : fmt(money),
                ],
            };
        });

        // keep an empty data row between the two header rows when nothing matched
        if (rows.length === 0) rows.push({ cells: columns.map(() => "") });

        rows.push({
            kind: "header",
            cells: ["Total", "", fmt(round2(totalHours)), "", hasMoney ? fmt(round2(totalMoney)) : ""],
        });

        return { columns, rows };
    }

    // detailed: one row per entry
    const columns = [
        { header: "Date", width: 1.2 },
        { header: "Project", width: 1.2 },
    ];
    if (opts.includeTitles) columns.push({ header: "Title", width: 1.6 });
    if (opts.includeSummaries) columns.push({ header: "Summary", width: 2 });
    columns.push({ header: "Hours", width: 0.9 }, { header: "Rate", width: 0.9 }, { header: "Total", width: 0.9 });

    const sorted = [...entries].sort((a, b) =>
        a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
    );

    const rows: TableInitRow[] = sorted.map((e) => {
        const hours = hoursOf(roundSeconds(e.total, roundMinutes));
        const money = lineMoney(e.project_id, hours);
        totalHours += hours;
        if (money != null) {
            totalMoney += money;
            hasMoney = true;
        }
        const cells = [formatDateMedium(e.date), e.project_name];
        if (opts.includeTitles) cells.push(e.title ?? "");
        if (opts.includeSummaries) cells.push(e.summary ?? "");
        cells.push(fmt(hours), rateCell(e.project_id), money == null ? "" : fmt(money));
        return { cells };
    });

    // keep an empty data row between the two header rows when nothing matched
    if (rows.length === 0) rows.push({ cells: columns.map(() => "") });

    const totalCells = ["Total", ""];
    if (opts.includeTitles) totalCells.push("");
    if (opts.includeSummaries) totalCells.push("");
    totalCells.push(fmt(round2(totalHours)), "", hasMoney ? fmt(round2(totalMoney)) : "");
    rows.push({ kind: "header", cells: totalCells });

    return { columns, rows };
}
