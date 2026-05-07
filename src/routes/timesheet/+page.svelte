<script lang="ts">
    import { onMount } from "svelte";
    import { resizeWindow, enableScroll } from "$lib/window";
    import { getProjects } from "$lib/db";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Select from "$lib/components/select.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Download, ViewList, ViewWeek, CalendarMonth } from "$lib/icons";
    import type { Project } from "$lib/types";

    type View = "vl" | "vw" | "vc";
    type Round = "1" | "5" | "15";

    let projects: Project[] = $state([]);
    let selectedRange: string = $state("7");
    let customStart: string = $state("");
    let customEnd: string = $state("");
    let selectedProjects: string[] = $state([]);
    let view: View = $state("vl");
    let roundTo: Round = $state("1");

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

    const viewLabel: Record<View, string> = {
        vl: "List view",
        vw: "Week view",
        vc: "Calendar view",
    };

    let projectOptions: Array<{ value: string; label: string }> = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );

    onMount(() => {
        const teardown = enableScroll();
        (async () => {
            await resizeWindow(400, 700);
            projects = await getProjects();
        })();
        return teardown;
    });

    function handleExport(): void {
        // export pipeline pending
    }
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
                bind:values={selectedProjects}
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
            <input type="date" bind:value={customStart} />
            <span class="range-sep">to</span>
            <input type="date" bind:value={customEnd} />
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

    <div class="view-pane">
        {viewLabel[view]} selected
    </div>
</main>

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

    .view-pane {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        background: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
        color: var(--gray-30);
        font-size: 0.875rem;
    }
</style>
