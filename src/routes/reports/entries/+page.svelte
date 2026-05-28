<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Select from "$lib/components/select.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add, CalendarMonth, Receipt, Alarm } from "$lib/icons";
    import { goto } from "$app/navigation";
    import DayDetail from "$lib/components/reports/day-detail.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import DialogEditEntry from "$lib/components/dialogs/dialog-edit-entry.svelte";
    import DialogAddEntry from "$lib/components/dialogs/dialog-add-entry.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import { onMount } from "svelte";
    import {
        getProjects,
        getReportEntries,
        updateEntry,
        updateEntryTimes,
        deleteEntry,
        createManualEntry,
    } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";
    import { formatDateISO, formatDateLong, formatDateMedium, formatDuration, formatTimeOfDay } from "$lib/format";
    import { loadRangeState, saveRangeState } from "$lib/range-storage";
    import type { Project, ReportEntry } from "$lib/types";

    const persisted = loadRangeState();
    let selectedRange: string = $state(persisted.selectedRange ?? "30");
    let customStart: string = $state(persisted.customStart ?? "");
    let customEnd: string = $state(persisted.customEnd ?? "");
    let prevNumericRange: string = $state(
        persisted.selectedRange && persisted.selectedRange !== "custom"
            ? persisted.selectedRange
            : "7"
    );

    function ensureCustomDates(): void {
        if (selectedRange !== "custom") return;
        if (customStart && customEnd) return;
        const today = new Date();
        const parsed = parseInt(prevNumericRange);
        const days = Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
        const start = new Date(today);
        start.setDate(today.getDate() - days + 1);
        customStart = formatDateISO(start);
        customEnd = formatDateISO(today);
    }
    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let selectedDate: string | null = $state(null);
    let loading: boolean = $state(true);

    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);

    let addOpen: boolean = $state(false);

    let deleteOpen: boolean = $state(false);
    let deleteTarget: ReportEntry | null = $state(null);

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

    interface GroupedDay {
        date: string;
        entries: ReportEntry[];
        total: number;
    }

    let groupedEntries: GroupedDay[] = $derived.by(() => {
        const map = new Map<string, ReportEntry[]>();
        for (const e of entries) {
            if (!map.has(e.date)) map.set(e.date, []);
            map.get(e.date)!.push(e);
        }
        return Array.from(map, ([date, dayEntries]) => ({
            date,
            entries: dayEntries,
            total: dayEntries.reduce((s, e) => s + e.total, 0),
        }));
    });

    let selectedDay: GroupedDay | null = $derived(
        selectedDate
            ? groupedEntries.find(g => g.date === selectedDate) ?? null
            : null
    );

    async function loadEntries() {
        const range = getDateRange();
        if (!range) return;
        loading = true;
        entries = await getReportEntries(range.start, range.end);
        // drop selection if the date no longer exists in the new range
        if (selectedDate && !entries.some(e => e.date === selectedDate)) {
            selectedDate = null;
        }
        loading = false;
    }

    function handleRangeChange() {
        if (selectedRange !== "custom") prevNumericRange = selectedRange;
        ensureCustomDates();
        saveRangeState({ selectedRange, customStart, customEnd });
        loadEntries();
    }

    function openEdit(entry: ReportEntry) {
        editEntry = entry;
        editOpen = true;
    }

    async function handleSave(data: {
        entryId: number;
        timerId: number;
        projectId: number;
        title: string | null;
        summary: string | null;
        date: string;
        start: string;
        end: string;
        reason: string | null;
    }) {
        await updateEntry(data.entryId, data.projectId, data.title, data.summary, data.reason);
        await updateEntryTimes(data.timerId, data.date, data.start, data.end);

        editOpen = false;
        editEntry = null;
        await loadEntries();
    }

    async function handleAdd(data: {
        projectId: number;
        date: string;
        start: string;
        end: string;
        title: string | null;
        summary: string | null;
    }) {
        await createManualEntry(
            data.projectId,
            data.date,
            data.start,
            data.end,
            data.title,
            data.summary,
        );
        addOpen = false;
        await loadEntries();
    }

    function requestDelete(entry: ReportEntry) {
        deleteTarget = entry;
        deleteOpen = true;
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        await deleteEntry(deleteTarget.entry_id, deleteTarget.timer_id);
        deleteOpen = false;
        deleteTarget = null;
        await loadEntries();
    }

    function cancelDelete() {
        deleteOpen = false;
        deleteTarget = null;
    }

    onMount(async () => {
        ensureCustomDates();
        saveRangeState({ selectedRange, customStart, customEnd });
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        await loadEntries();
    });
</script>

<main>
    <PageNavigation previousPage="/reports">
        <div class="nav-actions">
            {#if selectedRange === "custom"}
                <div class="custom-range">
                    <input
                        type="date"
                        bind:value={customStart}
                        onchange={handleRangeChange}
                    />
                    <span class="range-sep">to</span>
                    <input
                        type="date"
                        bind:value={customEnd}
                        onchange={handleRangeChange}
                    />
                </div>
            {/if}
            <div class="range-select">
                <Select
                    options={[
                        { value: "7", label: "Last 7 days" },
                        { value: "14", label: "Last 14 days" },
                        { value: "30", label: "Last 30 days" },
                        { value: "90", label: "Last 3 Months" },
                        { value: "180", label: "Last 6 Months" },
                        { value: "365", label: "Last Year" },
                        { value: "all", label: "All Time" },
                        { value: "custom", label: "Custom Range" },
                    ]}
                    size="sm"
                    nullable={false}
                    searchable={false}
                    bind:value={selectedRange}
                    onchange={handleRangeChange}
                />
            </div>
            <Button
                size="xs"
                title="Add Log"
                onclick={() => (addOpen = true)}
            >
                <Icon path={Add} size="14" />
                <span>Add Log</span>
            </Button>
        </div>
    </PageNavigation>

    {#if loading}
        <p class="empty">Loading...</p>
    {:else if entries.length === 0}
        <EmptyState
            icon={Receipt}
            title="No entries in this range"
            description="Track time with the timer or add a manual log to populate this view."
            actionLabel="Go to Timer"
            actionIcon={Alarm}
            onaction={() => goto("/")}
        />
    {:else}
        <div class="split">
            <aside class="dates">
                {#each groupedEntries as group (group.date)}
                    <button
                        class="date-item"
                        class:active={selectedDate === group.date}
                        onclick={() => (selectedDate = group.date)}
                    >
                        <span class="meta">
                            <span class="date">{formatDateLong(group.date)}</span>
                            <span class="count">
                                {group.entries.length}
                                {group.entries.length === 1 ? "entry" : "entries"}
                            </span>
                        </span>
                        <span class="total">{formatDuration(group.total)}</span>
                    </button>
                {/each}
            </aside>
            <section class="detail">
                {#if selectedDay}
                    <DayDetail
                        entries={selectedDay.entries}
                        {colorMap}
                        onedit={openEdit}
                        ondelete={requestDelete}
                    />
                {:else}
                    <EmptyState
                        icon={CalendarMonth}
                        title="Select a day"
                        description="Pick a day from the list to view its time entries, edit them, or add new logs."
                    />
                {/if}
            </section>
        </div>
    {/if}
</main>

<DialogAddEntry
    open={addOpen}
    {projects}
    onsave={handleAdd}
    onclose={() => (addOpen = false)}
/>

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
    message={deleteTarget
        ? `Delete entry ${formatDateMedium(deleteTarget.date)} @ ${formatTimeOfDay(deleteTarget.start)} - ${formatTimeOfDay(deleteTarget.end ?? "")}? This cannot be undone.`
        : ""}
    confirmLabel="Delete"
    cancelLabel="Cancel"
    onconfirm={confirmDelete}
    oncancel={cancelDelete}
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

    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
        margin-top: 40px;
    }

    /* titlebar 30 + main padding ~46 + page-nav ~46 + headroom 16 = ~138 */
    .split {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: 6px;
        height: calc(100vh - 100px);
        min-height: 240px;
    }

    .dates {
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .dates::-webkit-scrollbar,
    .detail::-webkit-scrollbar {
        width: 6px;
    }

    .dates::-webkit-scrollbar-track,
    .detail::-webkit-scrollbar-track {
        background: transparent;
    }

    .dates::-webkit-scrollbar-thumb,
    .detail::-webkit-scrollbar-thumb {
        background: var(--gray-60);
        border-radius: 3px;
    }

    .dates::-webkit-scrollbar-thumb:hover,
    .detail::-webkit-scrollbar-thumb:hover {
        background: var(--gray-50);
    }

    .date-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        padding: 5px 10px;
        background: var(--gray-80);
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: var(--gray-10);
        transition: background 0.12s ease, border-color 0.12s ease;
    }

    .date-item:hover {
        background: var(--gray-70);
    }

    .date-item.active {
        background: var(--gray-70);
        border-color: var(--gray-50);
    }

    .meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .date {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--gray-10);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 3px;
    }

    .count {
        font-size: 0.68rem;
        color: var(--gray-40);
    }

    .total {
        font-size: 0.75rem;
        color: var(--gray-20);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .detail {
        overflow-y: auto;
        padding: 4px;
    }
</style>
