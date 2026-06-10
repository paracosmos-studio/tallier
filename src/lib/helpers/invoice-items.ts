import { roundSeconds, formatDateMedium } from "./format";
import { currencySymbol } from "./currency";
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

// grand total: thousands-grouped, 2dp, prefixed with the currency symbol (if any)
const fmtTotal = (n: number, symbol: string): string =>
    `${symbol}${round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// a line item plus the metadata needed to total and group it by currency
type Line = {
    currency: string | null; // set only when the line carries money in a chosen currency
    hours: number;
    money: number | null;
    cells: string[];
};

type Column = { header: string; width: number };
type TotalsRow = (label: string, hours: number, money: string) => TableInitRow;

/**
 * Splits lines into sections and appends totals.
 *
 * With at most one distinct currency the result is a single section whose
 * totals carry that currency's symbol (or none when unset). When lines span
 * two or more currencies they are split into a section per currency, each with
 * its own symboled total; lines without a currency trail in a final section.
 */
function assemble(columns: Column[], lines: Line[], totalsRow: TotalsRow): TableInitRow[] {
    const currencies: string[] = [];
    for (const l of lines) if (l.currency && !currencies.includes(l.currency)) currencies.push(l.currency);

    const dataRow = (l: Line): TableInitRow => ({ cells: l.cells });
    const sumHours = (ls: Line[]): number => round2(ls.reduce((s, l) => s + l.hours, 0));
    const sumMoney = (ls: Line[]): number => ls.reduce((s, l) => s + (l.money ?? 0), 0);
    const moneyTotal = (ls: Line[], symbol: string): string =>
        ls.some((l) => l.money != null) ? fmtTotal(sumMoney(ls), symbol) : "";

    // mixed currencies: one section per currency, each totalled on its own
    if (currencies.length >= 2) {
        const groups = new Map<string, Line[]>();
        const plain: Line[] = [];
        for (const l of lines) {
            if (!l.currency) {
                plain.push(l);
                continue;
            }
            const g = groups.get(l.currency);
            if (g) g.push(l);
            else groups.set(l.currency, [l]);
        }

        const rows: TableInitRow[] = [];
        for (const code of currencies) {
            const ls = groups.get(code)!;
            ls.forEach((l) => rows.push(dataRow(l)));
            rows.push(totalsRow(`Total (${code})`, sumHours(ls), moneyTotal(ls, currencySymbol(code) ?? "")));
        }
        if (plain.length) {
            plain.forEach((l) => rows.push(dataRow(l)));
            rows.push(totalsRow("Total", sumHours(plain), moneyTotal(plain, "")));
        }
        return rows;
    }

    // one currency (or none): a single section with one totals row
    const symbol = currencies.length === 1 ? currencySymbol(currencies[0]) ?? "" : "";
    const rows: TableInitRow[] = lines.map(dataRow);
    // keep an empty data row between the two header rows when nothing matched
    if (rows.length === 0) rows.push({ cells: columns.map(() => "") });
    rows.push(totalsRow("Total", sumHours(lines), moneyTotal(lines, symbol)));
    return rows;
}

/**
 * Builds a `TableInit` of invoice line items from report entries.
 *
 * Entries flagged non-billable are dropped before anything else. Each
 * remaining entry's duration is rounded to `roundMinutes` (billing-style)
 * before being converted to hours. Money values are computed from the
 * project's hourly rate; entries on a project with no rate leave Rate/Total blank.
 *
 * Totals respect each project's currency: when every billed project shares one
 * currency its symbol prefixes the grand total; when none is set the total has
 * no symbol; when the selection mixes currencies the items are split into a
 * section per currency, each with its own total. Column sums use the same
 * 2-decimal values shown per row, so the displayed figures always add up.
 *
 * @param allEntries - Report entries already filtered to the chosen projects/range (non-billable ones are dropped here).
 * @param projects - All projects, used to resolve hourly rates and currencies.
 * @param roundMinutes - Rounding step in minutes (<=1 means no rounding).
 * @param opts - Shaping options from the generate dialog.
 */
export function buildInvoiceItems(
    allEntries: ReportEntry[],
    projects: Project[],
    roundMinutes: number,
    opts: InvoiceItemOptions,
): TableInit {
    // non-billable entries never reach an invoice
    const entries = allEntries.filter((e) => e.is_billable);

    const rateById = new Map<number, number | null>();
    const currencyById = new Map<number, string | null>();
    for (const p of projects) {
        if (p.id != null) {
            rateById.set(p.id, p.hourly_rate);
            currencyById.set(p.id, p.currency);
        }
    }

    const lineMoney = (projectId: number, hours: number): number | null => {
        const rate = rateById.get(projectId) ?? null;
        return rate == null ? null : round2(hours * rate);
    };
    const rateCell = (projectId: number): string => {
        const rate = rateById.get(projectId) ?? null;
        return rate == null ? "" : fmt(rate);
    };
    // currency only tags a line that actually carries money
    const lineCurrency = (projectId: number, money: number | null): string | null =>
        money == null ? null : currencyById.get(projectId) ?? null;

    if (opts.cumulativeOnly) {
        const columns: Column[] = [
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

        const lines: Line[] = sorted.map((g) => {
            const hours = hoursOf(g.seconds);
            const money = lineMoney(g.projectId, hours);
            return {
                currency: lineCurrency(g.projectId, money),
                hours,
                money,
                cells: [
                    formatDateMedium(g.date),
                    g.name,
                    fmt(hours),
                    rateCell(g.projectId),
                    money == null ? "" : fmt(money),
                ],
            };
        });

        const totalsRow: TotalsRow = (label, hours, money) => ({
            kind: "header",
            cells: [label, "", fmt(hours), "", money],
        });

        return { columns, rows: assemble(columns, lines, totalsRow) };
    }

    // detailed: one row per entry
    const columns: Column[] = [
        { header: "Date", width: 1.2 },
        { header: "Project", width: 1.2 },
    ];
    if (opts.includeTitles) columns.push({ header: "Title", width: 1.6 });
    if (opts.includeSummaries) columns.push({ header: "Summary", width: 2 });
    columns.push({ header: "Hours", width: 0.9 }, { header: "Rate", width: 0.9 }, { header: "Total", width: 0.9 });

    const sorted = [...entries].sort((a, b) =>
        a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
    );

    const lines: Line[] = sorted.map((e) => {
        const hours = hoursOf(roundSeconds(e.total, roundMinutes));
        const money = lineMoney(e.project_id, hours);
        const cells = [formatDateMedium(e.date), e.project_name];
        if (opts.includeTitles) cells.push(e.title ?? "");
        if (opts.includeSummaries) cells.push(e.summary ?? "");
        cells.push(fmt(hours), rateCell(e.project_id), money == null ? "" : fmt(money));
        return { currency: lineCurrency(e.project_id, money), hours, money, cells };
    });

    const totalsRow: TotalsRow = (label, hours, money) => {
        const cells = [label, ""];
        if (opts.includeTitles) cells.push("");
        if (opts.includeSummaries) cells.push("");
        cells.push(fmt(hours), "", money);
        return { kind: "header", cells };
    };

    return { columns, rows: assemble(columns, lines, totalsRow) };
}
