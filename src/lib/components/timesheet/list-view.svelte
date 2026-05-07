<!--
    @component
    Timesheet list view: per-day groups of project rows with rounded totals,
    plus a grand-total card at the bottom. Edit/delete bubble up to the page.

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for an entry.
    @param {(entry: ReportEntry) => void} ondelete - trigger delete for an entry.
-->
<script lang="ts">
    import DayGroup from "./day-group.svelte";
    import { formatDuration } from "$lib/format";
    import { buildDayGroups, projectKey } from "$lib/timesheet";
    import type { ReportEntry } from "$lib/types";
    import type { TimesheetDayGroup } from "$lib/timesheet";

    type Props = {
        entries: ReportEntry[];
        colorMap: Map<number, string>;
        roundMinutes: number;
        onedit: (entry: ReportEntry) => void;
        ondelete: (entry: ReportEntry) => void;
    };

    let { entries, colorMap, roundMinutes, onedit, ondelete }: Props = $props();

    let expanded: Set<string> = $state(new Set());
    let notes: Map<string, string> = $state(new Map());

    let dayGroups: TimesheetDayGroup[] = $derived(
        buildDayGroups(entries, roundMinutes)
    );

    let grandTotal: number = $derived(
        dayGroups.reduce((s, d) => s + d.totalRounded, 0)
    );

    function toggle(date: string, projectId: number): void {
        const k = projectKey(date, projectId);
        const next = new Set(expanded);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        expanded = next;
    }

    function setNote(date: string, projectId: number, value: string): void {
        const next = new Map(notes);
        next.set(projectKey(date, projectId), value);
        notes = next;
    }
</script>

{#if dayGroups.length === 0}
    <p class="empty">No entries for the selected filters.</p>
{:else}
    <div class="days">
        {#each dayGroups as dg (dg.date)}
            <DayGroup
                date={dg.date}
                projects={dg.projects}
                dayTotal={dg.totalRounded}
                {colorMap}
                {expanded}
                {notes}
                ontoggle={(pid) => toggle(dg.date, pid)}
                onnotes={(pid, v) => setNote(dg.date, pid, v)}
                {onedit}
                {ondelete}
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

    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
        margin-top: 40px;
    }

    .grand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
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
