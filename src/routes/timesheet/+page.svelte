<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getProjects, getReportEntries, getSetting } from "$lib/db";
    import { parseWeekStartsOn, WEEK_START_SETTING_KEY, DEFAULT_WEEK_START } from "$lib/helpers/date-utils";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import { computeDateRange } from "$lib/helpers/date-range";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Select from "$lib/components/select.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import DateRangeFilter from "$lib/components/date-range-filter.svelte";
    import ListView from "$lib/components/timesheet/list-view.svelte";
    import WeekView from "$lib/components/timesheet/week-view.svelte";
    import CalendarView from "$lib/components/timesheet/calendar-view.svelte";
    import DialogExport from "$lib/components/dialogs/dialog-export.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import DialogFullscreen from "$lib/components/dialogs/dialog-fullscreen.svelte";
    import DialogEditEntry from "$lib/components/dialogs/dialog-edit-entry.svelte";
    import FlyingAirplaneSuccess from "$lib/animations/flying-airplane-success.svelte";
    import { exportTimesheet, pathExists, targetPath, type ExportFormat } from "$lib/helpers/export-timesheet";
    import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
    import { invoke } from "@tauri-apps/api/core";
    import { Download, ViewList, ViewWeek, CalendarMonth, Receipt, Alarm } from "$lib/icons";
    import type { Project, ReportEntry } from "$lib/types";
    import type { EntryOverride } from "$lib/helpers/timesheet";

    type View = "vl" | "vw" | "vc";
    type Round = "1" | "5" | "15";

    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let loading: boolean = $state(true);
    let activeRange: { start: string; end: string } = $state({ start: "", end: "" });

    // shared across all three views so edits/hides persist when switching views
    let hiddenIds: Set<number> = $state(new Set());
    let overrides: Map<number, EntryOverride> = $state(new Map());
    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);
    let editSiblings: ReportEntry[] | null = $state(null);

    let selectedRange: string = $state("7");
    let customStart: string = $state("");
    let customEnd: string = $state("");
    let selectedProjects: string[] = $state([]);
    let view: View = $state("vl");
    let roundTo: Round = $state("1");
    let weekStartsOn: number = $state(DEFAULT_WEEK_START);

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

    async function loadEntries(): Promise<void> {
        const range = computeDateRange(selectedRange, customStart, customEnd);
        if (!range) return;
        loading = true;
        entries = await getReportEntries(range.start, range.end);
        // non-billable entries default to hidden from the timesheet; keep any manual hides
        const nextHidden = new Set(hiddenIds);
        for (const e of entries) if (!e.is_billable) nextHidden.add(e.entry_id);
        hiddenIds = nextHidden;
        activeRange = range;
        loading = false;
    }

    type PendingExport = {
        format: ExportFormat;
        includeNotes: boolean;
        location: string;
        path: string;
    };

    let exportOpen: boolean = $state(false);
    let exportError: string | null = $state(null);
    let overwriteOpen: boolean = $state(false);
    let pendingExport: PendingExport | null = $state(null);
    let successOpen: boolean = $state(false);

    function handleExport(): void {
        exportError = null;
        exportOpen = true;
    }

    async function notify(title: string, body: string): Promise<void> {
        let granted = await isPermissionGranted();
        if (!granted) granted = (await requestPermission()) === "granted";
        if (granted) {
            await invoke("plugin:notification|notify", { options: { title, body } });
        }
    }

    async function runExport(p: PendingExport): Promise<void> {
        const visibleEntries = filteredEntries.filter((e) => !hiddenIds.has(e.entry_id));
        const path = await exportTimesheet({
            entries: visibleEntries,
            range: activeRange,
            format: p.format,
            includeNotes: p.includeNotes,
            location: p.location,
            roundMinutes,
        });
        exportOpen = false;
        overwriteOpen = false;
        pendingExport = null;
        successOpen = true;
        await notify("Export complete", path);
    }

    async function handleExportConfirm(data: { format: string; includeNotes: boolean; location: string }): Promise<void> {
        if (data.format !== "csv" && data.format !== "json") return;
        const pending: PendingExport = {
            format: data.format as ExportFormat,
            includeNotes: data.includeNotes,
            location: data.location,
            path: targetPath(data.location, activeRange, data.format as ExportFormat),
        };
        try {
            if (await pathExists(pending.path)) {
                pendingExport = pending;
                overwriteOpen = true;
                return;
            }
            await runExport(pending);
        } catch (err) {
            exportError = err instanceof Error ? err.message : String(err);
        }
    }

    async function handleOverwriteConfirm(): Promise<void> {
        if (!pendingExport) return;
        try {
            await runExport(pendingExport);
        } catch (err) {
            overwriteOpen = false;
            exportError = err instanceof Error ? err.message : String(err);
        }
    }

    function handleOverwriteCancel(): void {
        overwriteOpen = false;
        pendingExport = null;
    }

    function openEdit(entry: ReportEntry, siblings?: ReportEntry[] | null): void {
        editEntry = entry;
        editSiblings = siblings && siblings.length > 1 ? siblings : null;
        editOpen = true;
    }

    function closeEdit(): void {
        editOpen = false;
        editEntry = null;
        editSiblings = null;
    }

    function handleEditNavigate(next: ReportEntry): void {
        editEntry = next;
    }

    function toggleHide(entryId: number): void {
        const next = new Set(hiddenIds);
        if (next.has(entryId)) next.delete(entryId);
        else next.add(entryId);
        hiddenIds = next;
    }

    function handleEditSave(data: {
        entryId: number;
        projectId: number;
        title: string | null;
        summary: string | null;
        date: string;
        start: string;
        end: string;
        hidden?: boolean;
    }): void {
        const nextOverrides = new Map(overrides);
        nextOverrides.set(data.entryId, {
            projectId: data.projectId,
            title: data.title,
            summary: data.summary,
            date: data.date,
            start: data.start,
            end: data.end,
        });
        overrides = nextOverrides;

        if (data.hidden !== undefined) {
            const nextHidden = new Set(hiddenIds);
            if (data.hidden) nextHidden.add(data.entryId);
            else nextHidden.delete(data.entryId);
            hiddenIds = nextHidden;
        }

        closeEdit();
    }

    onMount(async () => {
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        weekStartsOn = parseWeekStartsOn(await getSetting(WEEK_START_SETTING_KEY));
        await loadEntries();
    });
</script>

<main>
    <PageNavigation previousPage="/">
        <div class="nav-actions">
            <DateRangeFilter
                bind:selectedRange
                bind:customStart
                bind:customEnd
                onchange={loadEntries}
            />
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
                searchable={true}
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
            {hiddenIds}
            {overrides}
            onedit={openEdit}
            onhide={toggleHide}
        />
    {:else if view === "vw"}
        <WeekView
            entries={filteredEntries}
            {projects}
            {colorMap}
            {roundMinutes}
            {hiddenIds}
            {overrides}
            {weekStartsOn}
            onedit={openEdit}
        />
    {:else}
        <CalendarView
            entries={filteredEntries}
            {projects}
            {colorMap}
            {roundMinutes}
            start={activeRange.start}
            end={activeRange.end}
            {hiddenIds}
            {overrides}
            {weekStartsOn}
            onedit={openEdit}
        />
    {/if}
</main>

<DialogEditEntry
    open={editOpen}
    entry={editEntry}
    {projects}
    showReason={false}
    showHide={true}
    initialHidden={editEntry ? hiddenIds.has(editEntry.entry_id) : false}
    siblings={editSiblings}
    notice="Edits here only affect this timesheet view. The original log in the database is unchanged."
    onsave={handleEditSave}
    onnavigate={handleEditNavigate}
    onclose={closeEdit}
/>

<DialogExport
    open={exportOpen}
    error={exportError}
    onexport={handleExportConfirm}
    onclose={() => (exportOpen = false)}
/>

<DialogConfirm
    open={overwriteOpen}
    title="File already exists"
    message={pendingExport
        ? `${pendingExport.path.split('/').pop()} already exists. Replace it?`
        : ""}
    confirmLabel="Replace"
    onconfirm={handleOverwriteConfirm}
    oncancel={handleOverwriteCancel}
/>

<DialogFullscreen
    open={successOpen}
    showCloseIcon={false}
    autoCloseMs={4500}
    onclose={() => (successOpen = false)}
>
    <div class="export-success">
        {#if successOpen}
            <FlyingAirplaneSuccess size={220} />
        {/if}
        <p class="success-text">Exported Successfully!</p>
    </div>
</DialogFullscreen>

<style>
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
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

    .export-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .success-text {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--gray-10);
        letter-spacing: 0.01em;
        opacity: 0;
        transform: translateY(4px);
        animation: success-text-in 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
    }

    /* matches the check-phase timing inside flying-airplane-success */
    @keyframes success-text-in {
        0%,
        87% {
            opacity: 0;
            transform: translateY(4px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
