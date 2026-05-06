<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Select from "$lib/components/select.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add } from "$lib/icons";
    import EntryGroup from "$lib/components/reports/entry-group.svelte";
    import DialogEditEntry from "$lib/components/reports/dialog-edit-entry.svelte";
    import DialogAddEntry from "$lib/components/reports/dialog-add-entry.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import { onMount } from "svelte";
    import { resizeWindow, enableScroll } from "$lib/window";
    import {
        getProjects,
        getReportEntries,
        updateEntry,
        updateEntryTimes,
        deleteEntry,
        createManualEntry,
    } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";
    import { formatDateISO } from "$lib/format";
    import { loadRangeState, saveRangeState } from "$lib/range-storage";
    import type { Project, ReportEntry } from "$lib/types";

    const persisted = loadRangeState();
    let selectedRange: string = $state(persisted.selectedRange ?? "30");
    let customStart: string = $state(persisted.customStart ?? "");
    let customEnd: string = $state(persisted.customEnd ?? "");
    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let expandedDays: Set<string> = $state(new Set());
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
    }

    let groupedEntries: GroupedDay[] = $derived.by(() => {
        const map = new Map<string, ReportEntry[]>();
        for (const e of entries) {
            if (!map.has(e.date)) map.set(e.date, []);
            map.get(e.date)!.push(e);
        }
        return Array.from(map, ([date, entries]) => ({ date, entries }));
    });

    async function loadEntries() {
        const range = getDateRange();
        if (!range) return;
        loading = true;
        entries = await getReportEntries(range.start, range.end);
        loading = false;
    }

    function handleRangeChange() {
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
        start: string;
        end: string;
        reason: string | null;
    }) {
        await updateEntry(data.entryId, data.projectId, data.title, data.summary, data.reason);
        await updateEntryTimes(data.timerId, data.start, data.end);

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

    function toggleDay(date: string) {
        const next = new Set(expandedDays);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        expandedDays = next;
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
    <PageNavigation previousPage="/reports">
        <Button
            size="xs"
            title="Add Entry"
            onclick={() => (addOpen = true)}
        >
            <Icon path={Add} size="14" />
            <span>Add Entry</span>
        </Button>
    </PageNavigation>

    <div class="sel">
        <Select
            options={[
                { value: "7", label: "Last 7 days" },
                { value: "14", label: "Last 14 days" },
                { value: "30", label: "Last Month" },
                { value: "90", label: "Last 3 Months" },
                { value: "180", label: "Last 6 Months" },
                { value: "365", label: "Last Year" },
                { value: "all", label: "All Time" },
                { value: "custom", label: "Custom Range" },
            ]}
            size="md"
            nullable={false}
            searchable={false}
            bind:value={selectedRange}
            onchange={handleRangeChange}
        />
    </div>

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

    {#if loading}
        <p class="empty">Loading...</p>
    {:else if entries.length === 0}
        <p class="empty">No entries for this range.</p>
    {:else}
        <div class="list">
            {#each groupedEntries as group (group.date)}
                <EntryGroup
                    date={group.date}
                    entries={group.entries}
                    expanded={expandedDays.has(group.date)}
                    {colorMap}
                    ontoggle={() => toggleDay(group.date)}
                    onedit={openEdit}
                    ondelete={requestDelete}
                />
            {/each}
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
    message={`Delete "${deleteTarget?.title || "Untitled"}"? This cannot be undone.`}
    confirmLabel="Delete"
    cancelLabel="Cancel"
    onconfirm={confirmDelete}
    oncancel={cancelDelete}
/>

<style>
    .sel {
        margin-bottom: 10px;
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

    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
        margin-top: 40px;
    }

    .list {
        display: flex;
        flex-direction: column;
    }
</style>
