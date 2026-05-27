<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getProjects, getReportEntries } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";
    import { formatDateISO } from "$lib/format";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Select from "$lib/components/select.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import ListView from "$lib/components/timesheet/list-view.svelte";
    import WeekView from "$lib/components/timesheet/week-view.svelte";
    import CalendarView from "$lib/components/timesheet/calendar-view.svelte";
    import DialogExport from "$lib/components/dialogs/dialog-export.svelte";
    import { Download, ViewList, ViewWeek, CalendarMonth, Receipt, Alarm } from "$lib/icons";
    import type { Project, ReportEntry } from "$lib/types";

    type View = "vl" | "vw" | "vc";
    type Round = "1" | "5" | "15";

    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let loading: boolean = $state(true);
    let activeRange: { start: string; end: string } = $state({ start: "", end: "" });

    let selectedRange: string = $state("7");
    let customStart: string = $state("");
    let customEnd: string = $state("");
    let selectedProjects: string[] = $state([]);
    let view: View = $state("vl");
    let roundTo: Round = $state("1");

    const rangeOptions = [
        { value: "7", label: "Last 7 days" },
        { value: "14", label: "Last 14 days" },
        { value: "30", label: "Last 30 days" },
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
        activeRange = range;
        loading = false;
    }

    let exportOpen: boolean = $state(false);

    function handleExport(): void {
        exportOpen = true;
    }

    function handleExportConfirm(_data: { format: string; includeNotes: boolean; location: string }): void {
        // export pipeline pending
        exportOpen = false;
    }

    onMount(async () => {
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        await loadEntries();
    });
</script>

<main>
    <PageNavigation previousPage="/">
        <div class="nav-actions">
            {#if selectedRange === "custom"}
                <div class="custom-range">
                    <input type="date" bind:value={customStart} onchange={loadEntries} />
                    <span class="range-sep">to</span>
                    <input type="date" bind:value={customEnd} onchange={loadEntries} />
                </div>
            {/if}
            <div class="range-select">
                <Select
                    options={rangeOptions}
                    size="sm"
                    nullable={false}
                    searchable={false}
                    bind:value={selectedRange}
                    onchange={loadEntries}
                />
            </div>
            <Button size="xs" title="Export timesheet" onclick={handleExport}>
                <Icon path={Download} size="16" />
                <span>Export</span>
            </Button>
        </div>
    </PageNavigation>

    <div class="filter-row">
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
        <div class="round-group">
            <span class="round-label">Round to</span>
            <SegmentedControl
                options={roundOptions}
                size="sm"
                bind:value={roundTo}
            />
        </div>
        <SegmentedControl
            options={viewOptions}
            size="sm"
            bind:value={view}
        />
    </div>

    {#if loading}
        <p class="empty">Loading...</p>
    {:else if filteredEntries.length === 0}
        <EmptyState
            icon={Receipt}
            title="No time tracked yet"
            description="Start a timer from the Timer screen and your entries will appear here, ready to compile into a timesheet."
            actionLabel="Go to Timer"
            actionIcon={Alarm}
            onaction={() => goto("/")}
        />
    {:else if view === "vl"}
        <ListView
            entries={filteredEntries}
            {projects}
            {colorMap}
            {roundMinutes}
        />
    {:else if view === "vw"}
        <WeekView
            entries={filteredEntries}
            {projects}
            {colorMap}
            {roundMinutes}
        />
    {:else}
        <CalendarView
            entries={filteredEntries}
            {projects}
            {colorMap}
            {roundMinutes}
            start={activeRange.start}
            end={activeRange.end}
        />
    {/if}
</main>

<DialogExport
    open={exportOpen}
    onexport={handleExportConfirm}
    onclose={() => (exportOpen = false)}
/>

<style>
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .range-select {
        width: 160px;
    }

    .filter-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
    }

    .filter-cell {
        width: 160px;
        min-width: 0;
    }

    .custom-range {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .custom-range input {
        background: var(--gray-80);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        color-scheme: dark;
        font-size: 0.8rem;
        padding: 4px 6px;
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

    .round-group {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }

    .round-label {
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
