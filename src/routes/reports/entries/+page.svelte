<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Select from "$lib/components/select.svelte";
    import EntryGroup from "$lib/components/reports/entry-group.svelte";
    import DialogEditEntry from "$lib/components/reports/dialog-edit-entry.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import { onMount } from "svelte";
    import { resizeWindow } from "$lib/window";
    import {
        getProjects,
        getReportEntries,
        updateEntry,
        updateEntryTimes,
        deleteEntry,
    } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";
    import { formatDateISO } from "$lib/format";
    import type { Project, ReportEntry } from "$lib/types";

    let selectedRange: string = $state("30");
    let projects: Project[] = $state([]);
    let entries: ReportEntry[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let expandedDays: Set<string> = $state(new Set());
    let loading: boolean = $state(true);

    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);

    let deleteOpen: boolean = $state(false);
    let deleteTarget: ReportEntry | null = $state(null);

    function getDateRange(): { start: string; end: string } {
        const today = new Date();
        const end = formatDateISO(today);
        if (selectedRange === "all") return { start: "2000-01-01", end };
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
        loading = true;
        const range = getDateRange();
        entries = await getReportEntries(range.start, range.end);
        loading = false;
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

        const original = entries.find(e => e.entry_id === data.entryId);
        if (original && (original.start !== data.start || original.end !== data.end)) {
            await updateEntryTimes(data.timerId, data.start, data.end);
        }

        editOpen = false;
        editEntry = null;
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

    onMount(async () => {
        await resizeWindow(400, 700);
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        await loadEntries();
    });
</script>

<main>
    <PageNavigation previousPage="/reports">
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
                ]}
                size="sm"
                nullable={false}
                searchable={false}
                bind:value={selectedRange}
                onchange={loadEntries}
            />
        </div>
    </PageNavigation>

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
        width: 150px;
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
