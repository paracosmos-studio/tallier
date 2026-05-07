<script lang="ts">
    import { onMount } from "svelte";
    import { resizeWindow, enableScroll } from "$lib/window";
    import {
        getProjects,
        getReportEntries,
        updateEntry,
        updateEntryTimes,
        deleteEntry,
    } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";
    import { formatDateISO } from "$lib/format";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Select from "$lib/components/select.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import Icon from "$lib/components/icon.svelte";
    import ListView from "$lib/components/timesheet/list-view.svelte";
    import WeekView from "$lib/components/timesheet/week-view.svelte";
    import CalendarView from "$lib/components/timesheet/calendar-view.svelte";
    import DialogEditEntry from "$lib/components/reports/dialog-edit-entry.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import { Download, ViewList, ViewWeek, CalendarMonth } from "$lib/icons";
    import type { Project, ReportEntry } from "$lib/types";

    type View = "vl" | "vw" | "vc";
    type Round = "1" | "5" | "15";

    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let loading: boolean = $state(true);

    let selectedRange: string = $state("7");
    let customStart: string = $state("");
    let customEnd: string = $state("");
    let selectedProjects: string[] = $state([]);
    let view: View = $state("vl");
    let roundTo: Round = $state("1");

    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);
    let deleteOpen: boolean = $state(false);
    let deleteTarget: ReportEntry | null = $state(null);

    const rangeOptions = [
        { value: "7", label: "Last 7 days" },
        { value: "14", label: "Last 14 days" },
        { value: "30", label: "Last Month" },
        { value: "90", label: "Last 3 Months" },
        { value: "180", label: "Last 6 Months" },
        { value: "365", label: "Last Year" },
        { value: "all", label: "All Time" },
        { value: "custom", label: "Custom Range" },
    ];

    const viewOptions = [
        { value: "vl", icon: ViewList, title: "List view" },
        { value: "vw", icon: ViewWeek, title: "Week view" },
        { value: "vc", icon: CalendarMonth, title: "Calendar view" },
    ];

    const roundOptions = [
        { value: "1", label: "1 min" },
        { value: "5", label: "5 min" },
        { value: "15", label: "15 min" },
    ];

    let projectOptions: Array<{ value: string; label: string }> = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );

    let roundMinutes: number = $derived(parseInt(roundTo));

    let filteredEntries: ReportEntry[] = $derived.by(() => {
        if (selectedProjects.length === 0) return entries;
        const ids = new Set(selectedProjects.map(v => parseInt(v)));
        return entries.filter(e => ids.has(e.project_id));
    });

    function getDateRange(): { start: string; end: string } | null {
        const today = new Date();
        const end = formatDateISO(today);

        if (selectedRange === "custom") {
            if (!customStart || !customEnd) return null;
            return { start: customStart, end: customEnd };
        }
        if (selectedRange === "all") {
            return { start: "2000-01-01", end };
        }
        const days = parseInt(selectedRange);
        const start = new Date(today);
        start.setDate(today.getDate() - days + 1);
        return { start: formatDateISO(start), end };
    }

    async function loadEntries(): Promise<void> {
        const range = getDateRange();
        if (!range) return;
        loading = true;
        entries = await getReportEntries(range.start, range.end);
        loading = false;
    }

    function openEdit(entry: ReportEntry): void {
        editEntry = entry;
        editOpen = true;
    }

    function requestDelete(entry: ReportEntry): void {
        deleteTarget = entry;
        deleteOpen = true;
    }

    async function handleSave(data: {
        entryId: number;
        timerId: number;
        projectId: number;
        title: string | null;
        summary: string | null;
        start: string;
        end: string;
        reason: string | null;
    }): Promise<void> {
        await updateEntry(data.entryId, data.projectId, data.title, data.summary, data.reason);
        await updateEntryTimes(data.timerId, data.start, data.end);
        editOpen = false;
        editEntry = null;
        await loadEntries();
    }

    async function confirmDelete(): Promise<void> {
        if (!deleteTarget) return;
        await deleteEntry(deleteTarget.entry_id, deleteTarget.timer_id);
        deleteOpen = false;
        deleteTarget = null;
        await loadEntries();
    }

    function cancelDelete(): void {
        deleteOpen = false;
        deleteTarget = null;
    }

    function handleExport(): void {
        // export pipeline pending
    }

    onMount(() => {
        const teardown = enableScroll();
        (async () => {
            await resizeWindow(400, 700);
            projects = await getProjects();
            colorMap = buildProjectColorMap(projects);
            await loadEntries();
        })();
        return teardown;
    });
</script>

<main>
    <PageNavigation previousPage="/">
        <Button size="xs" title="Export timesheet" onclick={handleExport}>
            <Icon path={Download} size="16" />
            <span>Export</span>
        </Button>
    </PageNavigation>

    <div class="filter-row">
        <div class="filter-cell">
            <Select
                options={rangeOptions}
                size="sm"
                nullable={false}
                searchable={false}
                bind:value={selectedRange}
                onchange={loadEntries}
            />
        </div>
        <div class="filter-cell">
            <Select
                options={projectOptions}
                size="sm"
                multiple
                nullable
                searchable={false}
                placeholder="All projects"
                multipleLabel={(n) => `${n} projects`}
                values={selectedProjects}
                onchangemultiple={(v) => (selectedProjects = v)}
            />
        </div>
        <SegmentedControl
            options={viewOptions}
            size="sm"
            bind:value={view}
        />
    </div>

    {#if selectedRange === "custom"}
        <div class="custom-range">
            <input type="date" bind:value={customStart} onchange={loadEntries} />
            <span class="range-sep">to</span>
            <input type="date" bind:value={customEnd} onchange={loadEntries} />
        </div>
    {/if}

    <div class="round-row">
        <span class="round-label">Round to</span>
        <SegmentedControl
            options={roundOptions}
            size="sm"
            bind:value={roundTo}
        />
    </div>

    {#if loading}
        <p class="empty">Loading...</p>
    {:else if view === "vl"}
        <ListView
            entries={filteredEntries}
            {colorMap}
            {roundMinutes}
            onedit={openEdit}
            ondelete={requestDelete}
        />
    {:else if view === "vw"}
        <WeekView />
    {:else}
        <CalendarView />
    {/if}
</main>

<DialogEditEntry
    open={editOpen}
    entry={editEntry}
    {projects}
    onsave={handleSave}
    onclose={() => { editOpen = false; editEntry = null; }}
/>

<DialogConfirm
    open={deleteOpen}
    title="Delete Entry"
    message={`Delete "${deleteTarget?.title || "Untitled"}"? This cannot be undone.`}
    confirmLabel="Delete"
    cancelLabel="Cancel"
    onconfirm={confirmDelete}
    oncancel={cancelDelete}
/>

<style>
    .filter-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
    }

    .filter-cell {
        flex: 1;
        min-width: 0;
    }

    .custom-range {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }

    .custom-range input {
        flex: 1;
        background: var(--gray-80);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        color-scheme: dark;
        font-size: 0.8rem;
        padding: 6px 8px;
        font-family: inherit;
    }

    .custom-range input:focus {
        outline: none;
        border-color: var(--gray-40);
    }

    .range-sep {
        font-size: 0.75rem;
        color: var(--gray-40);
    }

    .round-row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
    }

    .round-label {
        flex: 1;
        font-size: 0.875rem;
        color: var(--gray-20);
    }

    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
        margin-top: 40px;
    }
</style>
