<!--
    @component
    Single-day section in the timesheet list view: date header with day total,
    followed by per-project rows.

    @param {string} date - the date string (YYYY-MM-DD).
    @param {TimesheetProjectGroup[]} projects - per-project aggregations for this day.
    @param {number} dayTotal - sum of rounded project totals for this day (seconds).
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {Set<string>} expanded - set of expanded "date|projectId" keys.
    @param {Map<string, string>} notes - notes by "date|projectId" key.
    @param {(projectId: number) => void} ontoggle - toggle a project row's expanded state.
    @param {(projectId: number, value: string) => void} onnotes - notes change callback.
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for an entry.
    @param {(entry: ReportEntry) => void} ondelete - trigger delete for an entry.
-->
<script lang="ts">
    import ProjectRow from "./project-row.svelte";
    import { formatDuration, formatDateLong } from "$lib/format";
    import { projectKey } from "$lib/timesheet";
    import type { ReportEntry } from "$lib/types";
    import type { TimesheetProjectGroup } from "$lib/timesheet";

    type Props = {
        date: string;
        projects: TimesheetProjectGroup[];
        dayTotal: number;
        colorMap: Map<number, string>;
        expanded: Set<string>;
        notes: Map<string, string>;
        ontoggle: (projectId: number) => void;
        onnotes: (projectId: number, value: string) => void;
        onedit: (entry: ReportEntry) => void;
        ondelete: (entry: ReportEntry) => void;
    };

    let {
        date,
        projects,
        dayTotal,
        colorMap,
        expanded,
        notes,
        ontoggle,
        onnotes,
        onedit,
        ondelete,
    }: Props = $props();
</script>

<section class="day">
    <header class="day-head">
        <span class="date">{formatDateLong(date)}</span>
        <span class="total">{formatDuration(dayTotal)}</span>
    </header>
    <div class="rows">
        {#each projects as pg (pg.projectId)}
            {@const k = projectKey(date, pg.projectId)}
            <ProjectRow
                projectName={pg.projectName}
                totalRounded={pg.totalRounded}
                entries={pg.entries}
                color={colorMap.get(pg.projectId) ?? "var(--gray-40)"}
                {colorMap}
                expanded={expanded.has(k)}
                notes={notes.get(k) ?? ""}
                onnotes={(v) => onnotes(pg.projectId, v)}
                ontoggle={() => ontoggle(pg.projectId)}
                {onedit}
                {ondelete}
            />
        {/each}
    </div>
</section>

<style>
    .day {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
    }

    .day-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 4px 2px;
        border-bottom: 1px solid var(--gray-80);
    }

    .date {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--gray-10);
    }

    .total {
        font-size: 0.75rem;
        color: var(--gray-20);
        font-variant-numeric: tabular-nums;
    }

    .rows {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
</style>
