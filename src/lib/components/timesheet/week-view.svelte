<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Timesheet week view: per-week tables of project rows with decimal-hour
    cells across a 7-day span and a daily Total footer. The week anchor day is
    driven by the user's `weekStartsOn` setting (0=Sun..6=Sat). The Project
    and Sum columns stay pinned while the weekday columns scroll horizontally.
    Tapping a non-empty cell asks the page to open the edit dialog on the
    entry behind it.

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Project[]} projects - all projects (used by the page-level edit dialog).
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
    @param {Set<number>} hiddenIds - entry IDs currently excluded from totals.
    @param {Map<number, EntryOverride>} overrides - view-only edits per entry.
    @param {number} weekStartsOn - 0..6 (Sun..Sat); anchors weeks to that day.
    @param {(entry: ReportEntry, siblings?: ReportEntry[]) => void} onedit - request to open the edit dialog; pass the full set of entries in the cell so the dialog can page through them.
-->
<script lang="ts">
    import { formatDateShort, formatDateISO, MONTHS } from "$lib/helpers/format";
    import { buildDayGroups, buildWeeks } from "$lib/helpers/timesheet";
    import { orderedDayLabels } from "$lib/helpers/date-utils";
    import type { ReportEntry, Project } from "$lib/types";
    import type { EntryOverride, WeekSection } from "$lib/helpers/timesheet";

    type Props = {
        entries: ReportEntry[];
        projects: Project[];
        colorMap: Map<number, string>;
        roundMinutes: number;
        hiddenIds: Set<number>;
        overrides: Map<number, EntryOverride>;
        weekStartsOn: number;
        onedit: (entry: ReportEntry, siblings?: ReportEntry[]) => void;
    };

    let {
        entries,
        projects,
        colorMap,
        roundMinutes,
        hiddenIds,
        overrides,
        weekStartsOn,
        onedit,
    }: Props = $props();

    let dayLabels: string[] = $derived(orderedDayLabels(weekStartsOn));

    let projectNames: Map<number, string> = $derived.by(() => {
        const m = new Map<number, string>();
        for (const p of projects) {
            if (p.id != null) m.set(p.id, p.name);
        }
        return m;
    });

    let weeks: WeekSection[] = $derived(
        buildWeeks(buildDayGroups(entries, roundMinutes, hiddenIds, overrides, projectNames), weekStartsOn)
    );

    const today: string = formatDateISO(new Date());

    function hours(seconds: number): string {
        return (Math.round((seconds / 3600) * 100) / 100).toFixed(2);
    }

    function rangeLabel(start: string, end: string): string {
        const s: Date = new Date(start + "T00:00:00");
        const e: Date = new Date(end + "T00:00:00");
        if (s.getMonth() === e.getMonth()) {
            return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`;
        }
        return `${formatDateShort(start)} – ${formatDateShort(end)}, ${e.getFullYear()}`;
    }

    function openEdit(cellEntries: ReportEntry[]): void {
        if (cellEntries.length === 0) return;
        // dedupe cross-midnight splits so the dialog pager doesn't show the
        // same source entry twice
        const seen = new Set<number>();
        const unique: ReportEntry[] = [];
        for (const e of cellEntries) {
            if (e.segment === "second") continue;
            if (seen.has(e.entry_id)) continue;
            seen.add(e.entry_id);
            unique.push(e);
        }
        if (unique.length === 0) return;
        onedit(unique[0], unique);
    }
</script>

{#each weeks as week (week.weekStart)}
    <section class="week">
        <header class="week-head">
            <span class="range">{rangeLabel(week.weekStart, week.weekEnd)}</span>
        </header>
        <div class="scroller">
            <table>
                <thead>
                    <tr>
                        <th class="col-proj head-proj" scope="col">Project</th>
                        {#each week.days as d, i (d)}
                            <th
                                class="col-day head-day"
                                class:today={d === today}
                                scope="col"
                            >
                                <span class="dow">{dayLabels[i]}</span>
                                <span class="dnum">{week.dayNumbers[i]}</span>
                            </th>
                        {/each}
                        <th class="col-sum head-sum" scope="col">∑</th>
                    </tr>
                </thead>
                <tbody>
                    {#each week.rows as row (row.projectId)}
                        <tr>
                            <th class="col-proj cell-proj" scope="row">
                                <span class="proj-inner">
                                    <span
                                        class="dot"
                                        style:background={colorMap.get(row.projectId) ?? "var(--gray-40)"}
                                    ></span>
                                    <span class="pname">{row.projectName}</span>
                                </span>
                            </th>
                            {#each row.cells as cell, i (i)}
                                {@const has = cell.entries.length > 0}
                                <td
                                    class="col-day cell-day"
                                    class:today={week.days[i] === today}
                                    class:empty={!has}
                                >
                                    {#if has}
                                        <button
                                            type="button"
                                            class="cell-btn"
                                            title="Edit entry"
                                            onclick={() => openEdit(cell.entries)}
                                        >
                                            {hours(cell.seconds)}
                                        </button>
                                    {:else}
                                        <span class="dash">—</span>
                                    {/if}
                                </td>
                            {/each}
                            <td class="col-sum cell-sum">{hours(row.total)}</td>
                        </tr>
                    {/each}
                </tbody>
                <tfoot>
                    <tr>
                        <th class="col-proj foot-proj" scope="row">Total</th>
                        {#each week.dailyTotals as s, i (i)}
                            <td
                                class="col-day foot-day"
                                class:today={week.days[i] === today}
                                class:empty={s === 0}
                            >
                                {s === 0 ? "—" : hours(s)}
                            </td>
                        {/each}
                        <td class="col-sum foot-sum">{hours(week.weekTotal)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </section>
{/each}

<style>
    .week {
        margin-top: 15px;
        margin-bottom: 22px;
    }

    .week-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 0 2px 6px 2px;
    }

    .range {
        font-size: 0.66rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--gray-30);
    }

    .scroller {
        overflow-x: auto;
        overflow-y: visible;
        border: 1px solid var(--gray-80);
        border-radius: 6px;
        background: var(--gray-90);
    }

    .scroller::-webkit-scrollbar-track {
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
        margin: 0;
    }

    .scroller::-webkit-scrollbar-thumb {
        background: var(--gray-60);
    }

    .scroller::-webkit-scrollbar-thumb:hover {
        background: var(--gray-50);
    }

    table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-variant-numeric: tabular-nums;
    }

    th, td {
        padding: 0;
        font-weight: 400;
        text-align: right;
        vertical-align: middle;
        border-bottom: 1px solid var(--gray-80);
    }

    tbody tr:last-child th,
    tbody tr:last-child td {
        border-bottom: none;
    }

    /* sticky pillars */
    .col-proj {
        position: sticky;
        left: 0;
        z-index: 2;
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
        min-width: 108px;
        max-width: 108px;
        text-align: left;
        border-right: 1px solid var(--gray-80);
    }

    .col-sum {
        position: sticky;
        right: 0;
        z-index: 2;
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
        min-width: 54px;
        border-left: 1px solid var(--gray-80);
    }

    .col-day {
        min-width: 42px;
    }

    /* header row */
    thead th {
        background: var(--gray-80);
        font-size: 0.62rem;
        color: var(--gray-30);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 6px 8px;
    }

    thead .col-proj {
        background: color-mix(in srgb, var(--gray-80) 55%, var(--color-background));
        z-index: 3;
    }

    thead .col-sum {
        background: color-mix(in srgb, var(--gray-80) 55%, var(--color-background));
        z-index: 3;
        text-align: center;
        font-size: 0.85rem;
        letter-spacing: 0;
    }

    .head-day {
        display: table-cell;
        text-align: center;
        padding: 4px 0;
    }

    .head-day .dow {
        display: block;
        font-size: 0.6rem;
        color: var(--gray-30);
    }

    .head-day .dnum {
        display: block;
        font-family: 'DM Mono', monospace;
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--gray-30);
        margin-top: 1px;
        letter-spacing: 0;
        text-transform: none;
    }

    /* body cells */
    .cell-proj {
        padding: 4px 10px;
    }

    .proj-inner {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
    }

    .dot {
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 2px;
    }

    .pname {
        flex: 1;
        min-width: 0;
        font-size: 0.74rem;
        color: var(--gray-10);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .cell-day {
        padding: 0;
    }

    .cell-btn {
        display: block;
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        font-family: 'DM Mono', monospace;
        font-size: 0.74rem;
        color: var(--gray-10);
        padding: 4px 4px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        transition: background 0.12s ease, color 0.12s ease;
    }

    .cell-btn:hover {
        background: var(--gray-80);
        color: var(--color-text);
    }

    .cell-day.empty {
        color: var(--gray-50);
    }

    .dash {
        display: inline-block;
        width: 100%;
        text-align: center;
        font-family: 'DM Mono', monospace;
        font-size: 0.7rem;
        color: var(--gray-50);
    }

    .cell-sum {
        padding: 0 10px;
        font-family: 'DM Mono', monospace;
        font-size: 0.74rem;
        color: var(--gray-20);
        text-align: center;
    }

    /* footer total row */
    tfoot td {
        background: var(--gray-90);
        border-top: 1px solid var(--gray-70);
    }

    tfoot .col-proj,
    tfoot .col-sum {
        border-top: 1px solid var(--gray-70);
    }

    .foot-proj {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--gray-20);
        padding: 5px 10px;
    }

    .foot-day {
        padding: 5px 4px;
        text-align: center;
        font-family: 'DM Mono', monospace;
        font-size: 0.74rem;
        color: var(--gray-10);
    }

    .foot-day.empty {
        color: var(--gray-50);
    }

    .foot-sum {
        padding: 0 10px;
        font-family: 'DM Mono', monospace;
        font-size: 0.78rem;
        color: var(--green);
        text-align: center;
        font-weight: 500;
    }

    /* today accent */
    .col-day.today {
        background: color-mix(in srgb, var(--green) 8%, transparent);
    }

    thead .col-day.today {
        background: color-mix(in srgb, var(--green) 14%, var(--gray-80));
    }

    thead .col-day.today .dow,
    thead .col-day.today .dnum {
        color: var(--green);
    }
</style>
