<!--
    @component
    Timesheet list view: per-day groups of project rows with rounded totals,
    plus a grand-total card at the bottom. Edits and hide/include actions
    only affect the local view — no database writes.

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Project[]} projects - all projects, for the edit dialog's project picker.
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
-->
<script lang="ts">
    import DayGroup from "./day-group.svelte";
    import DialogEditEntry from "$lib/components/reports/dialog-edit-entry.svelte";
    import { formatDuration } from "$lib/format";
    import { buildDayGroups, projectKey } from "$lib/timesheet";
    import type { ReportEntry, Project } from "$lib/types";
    import type { TimesheetDayGroup, EntryOverride } from "$lib/timesheet";

    type Props = {
        entries: ReportEntry[];
        projects: Project[];
        colorMap: Map<number, string>;
        roundMinutes: number;
    };

    let { entries, projects, colorMap, roundMinutes }: Props = $props();

    let expanded: Set<string> = $state(new Set());
    let notes: Map<string, string> = $state(new Map());
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

    let dayGroups: TimesheetDayGroup[] = $derived(
        buildDayGroups(entries, roundMinutes, hiddenIds, overrides, projectNames)
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

    function toggleHide(entryId: number): void {
        const next = new Set(hiddenIds);
        if (next.has(entryId)) next.delete(entryId);
        else next.add(entryId);
        hiddenIds = next;
    }

    function openEdit(entry: ReportEntry): void {
        editEntry = entry;
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
                {hiddenIds}
                ontoggle={(pid) => toggle(dg.date, pid)}
                onnotes={(pid, v) => setNote(dg.date, pid, v)}
                onhide={toggleHide}
                onedit={openEdit}
            />
        {/each}
    </div>
    <div class="grand">
        <span class="label">Total</span>
        <span class="value">{formatDuration(grandTotal)}</span>
    </div>
{/if}

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
