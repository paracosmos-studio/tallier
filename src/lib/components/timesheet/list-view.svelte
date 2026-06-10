<!--
    @component
    Timesheet list view: per-day groups of project rows with rounded totals,
    plus a grand-total card at the bottom. Hidden and override state is owned
    by the page so it stays in sync across views.

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Project[]} projects - all projects (used by the page-level edit dialog).
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
    @param {Set<number>} hiddenIds - entry IDs currently excluded from totals.
    @param {Map<number, EntryOverride>} overrides - view-only edits per entry.
    @param {(entry: ReportEntry) => void} onedit - request to open the edit dialog.
    @param {(entryId: number) => void} [onhide] - request to toggle the hidden state for an entry (eye icon).
    @param {(entryId: number) => void} [ondelete] - request to remove an entry from the list (trash icon).
-->
<script lang="ts">
    import DayGroup from "./day-group.svelte";
    import { formatDuration } from "$lib/helpers/format";
    import { buildDayGroups, projectKey } from "$lib/helpers/timesheet";
    import type { ReportEntry, Project } from "$lib/types";
    import type { TimesheetDayGroup, EntryOverride } from "$lib/helpers/timesheet";

    type Props = {
        entries: ReportEntry[];
        projects: Project[];
        colorMap: Map<number, string>;
        roundMinutes: number;
        hiddenIds: Set<number>;
        overrides: Map<number, EntryOverride>;
        onedit: (entry: ReportEntry) => void;
        onhide?: (entryId: number) => void;
        ondelete?: (entryId: number) => void;
    };

    let {
        entries,
        projects,
        colorMap,
        roundMinutes,
        hiddenIds,
        overrides,
        onedit,
        onhide,
        ondelete
    }: Props = $props();

    let collapsed: Set<string> = $state(new Set());

    let projectNames: Map<number, string> = $derived.by(() => {
        const m = new Map<number, string>();
        for (const p of projects) {
            if (p.id != null) m.set(p.id, p.name);
        }
        return m;
    });

    let dayGroups: TimesheetDayGroup[] = $derived(
        buildDayGroups(entries, roundMinutes, hiddenIds, overrides, projectNames)
    );

    let grandTotal: number = $derived(
        dayGroups.reduce((s, d) => s + d.totalRounded, 0)
    );

    function toggle(date: string, projectId: number): void {
        const k = projectKey(date, projectId);
        const next = new Set(collapsed);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        collapsed = next;
    }
</script>

{#if dayGroups.length > 0}
    <div class="days">
        {#each dayGroups as dg (dg.date)}
            <DayGroup
                date={dg.date}
                projects={dg.projects}
                dayTotal={dg.totalRounded}
                {colorMap}
                {collapsed}
                {hiddenIds}
                ontoggle={(pid) => toggle(dg.date, pid)}
                {onhide}
                {ondelete}
                {onedit}
            />
        {/each}
    </div>
    <div class="grand">
        <span class="label">Total</span>
        <span class="value">{formatDuration(grandTotal)}</span>
    </div>
{/if}

<style>
    .days {
        display: flex;
        flex-direction: column;
    }

    .grand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 6px 0 20px 0;
        padding: 12px 14px;
        background: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
    }

    .label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--gray-10);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .value {
        font-size: 0.95rem;
        color: var(--green);
        font-variant-numeric: tabular-nums;
        font-weight: 500;
    }
</style>
