<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Single-day section in the timesheet list view: date header with day total,
    followed by per-project rows.

    @param {string} date - the date string (YYYY-MM-DD).
    @param {TimesheetProjectGroup[]} projects - per-project aggregations for this day.
    @param {number} dayTotal - sum of rounded project totals for this day (seconds).
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {Set<string>} collapsed - set of collapsed "date|projectId" keys (default state is expanded).
    @param {Set<number>} hiddenIds - entry IDs excluded from totals.
    @param {(projectId: number) => void} ontoggle - toggle a project row's expanded state.
    @param {(entryId: number) => void} [onhide] - toggle hidden state for an entry (eye icon).
    @param {(entryId: number) => void} [ondelete] - remove an entry (trash icon).
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for an entry.
-->
<script lang="ts">
    import ProjectRow from "./project-row.svelte";
    import { formatDuration, formatDateLong } from "$lib/helpers/format";
    import { projectKey } from "$lib/helpers/timesheet";
    import type { ReportEntry } from "$lib/types";
    import type { TimesheetProjectGroup } from "$lib/helpers/timesheet";

    type Props = {
        date: string;
        projects: TimesheetProjectGroup[];
        dayTotal: number;
        colorMap: Map<number, string>;
        collapsed: Set<string>;
        hiddenIds: Set<number>;
        ontoggle: (projectId: number) => void;
        onhide?: (entryId: number) => void;
        ondelete?: (entryId: number) => void;
        onedit: (entry: ReportEntry) => void;
    };

    let {
        date,
        projects,
        dayTotal,
        colorMap,
        collapsed,
        hiddenIds,
        ontoggle,
        onhide,
        ondelete,
        onedit,
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
                expanded={!collapsed.has(k)}
                {hiddenIds}
                ontoggle={() => ontoggle(pg.projectId)}
                {onhide}
                {ondelete}
                {onedit}
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
    }

    .date {
        font-size: 0.78rem;
        font-weight: 400;
        color: var(--gray-20);
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
