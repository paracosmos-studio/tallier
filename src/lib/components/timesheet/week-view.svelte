<!--
    @component
    Timesheet week view: per-week tables of project rows with decimal-hour
    cells across Monday-Sunday and a daily Total footer. The Project and Sum
    columns stay pinned while the weekday columns scroll horizontallier.
    Tapping a non-empty cell opens the edit dialog on the entry behind it.

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Project[]} projects - all projects, for the edit dialog's project picker.
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
-->
<script lang="ts">
    import DialogEditEntry from "$lib/components/dialogs/dialog-edit-entry.svelte";
    import { formatDateShort, formatDateISO, MONTHS } from "$lib/format";
    import { buildDayGroups, buildWeeks } from "$lib/timesheet";
    import type { ReportEntry, Project } from "$lib/types";
    import type { EntryOverride, WeekSection } from "$lib/timesheet";

    type Props = {
        entries: ReportEntry[];
        projects: Project[];
        colorMap: Map<number, string>;
        roundMinutes: number;
    };

    let { entries, projects, colorMap, roundMinutes }: Props = $props();

    const DAY_LETTERS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    let hiddenIds: Set<number> = $state(new Set());
    let overrides: Map<number, EntryOverride> = $state(new Map());
    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);

    let projectNames: Map<number, string> = $derived.by(() => {
        const m = new Map<number, string>();
        for (const p of projects) {
            if (p.id != null) m.set(p.id, p.name);
        }
        return m;
    });

    let weeks: WeekSection[] = $derived(
        buildWeeks(buildDayGroups(entries, roundMinutes, hiddenIds, overrides, projectNames))
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

    function openEdit(entries: ReportEntry[]): void {
        if (entries.length === 0) return;
        editEntry = entries[0];
        editOpen = true;
    }

    function handleSave(data: {
        entryId: number;
        projectId: number;
        title: string | null;
        summary: string | null;
        date: string;
        start: string;
        end: string;
    }): void {
        const next = new Map(overrides);
        next.set(data.entryId, {
            projectId: data.projectId,
            title: data.title,
            summary: data.summary,
            date: data.date,
            start: data.start,
            end: data.end,
        });
        overrides = next;
        editOpen = false;
        editEntry = null;
    }

    function closeEdit(): void {
        editOpen = false;
        editEntry = null;
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
                                class:weekend={i >= 5}
                                class:today={d === today}
                                scope="col"
                            >
                                <span class="dow">{DAY_LETTERS[i]}</span>
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
                                    class:weekend={i >= 5}
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
                                class:weekend={i >= 5}
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

<DialogEditEntry
    open={editOpen}
    entry={editEntry}
    {projects}
    showReason={false}
    notice="Edits here only affect this timesheet view. The original log in the database is unchanged."
    onsave={handleSave}
    onclose={closeEdit}
/>

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

    /* weekend de-emphasis */
    .col-day.weekend {
        background: color-mix(in srgb, var(--gray-80) 35%, transparent);
    }

    .col-day.weekend .dow,
    .col-day.weekend .dnum {
        color: var(--gray-30);
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
