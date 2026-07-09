<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import SummaryStats from "$lib/components/reports/summary-stats.svelte";
    import BarList from "$lib/components/charts/bar-list.svelte";
    import StackedBarChart from "$lib/components/charts/stacked-bar-chart.svelte";
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import DateRangeFilter from "$lib/components/date-range-filter.svelte";
    import { Menu, ChartBar, Alarm } from "$lib/icons";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getProjects, getDailyProjectTotals, getProjectTotals } from "$lib/db";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import { formatDuration, formatDateISO, formatDateShort, formatDateMedium } from "$lib/helpers/format";
    import { computeDateRange } from "$lib/helpers/date-range";
    import { loadRangeState, saveRangeState } from "$lib/helpers/range-storage";
    import type { Project, ProjectTotal, DailyProjectTotal, StackedBarColumn, BarListItem } from "$lib/types";

    const persisted = loadRangeState();
    let selectedRange: string = $state(persisted.selectedRange ?? "7");
    let customStart: string = $state(persisted.customStart ?? "");
    let customEnd: string = $state(persisted.customEnd ?? "");

    let projects: Project[] = $state([]);
    let projectTotals: ProjectTotal[] = $state([]);
    let dailyTotals: DailyProjectTotal[] = $state([]);
    let activeRange: { start: string; end: string } = $state({ start: "", end: "" });
    let colorMap: Map<number, string> = $state(new Map());
    let loading: boolean = $state(true);

    let totalSeconds: number = $derived(
        projectTotals.reduce((s, t) => s + t.total_seconds, 0)
    );

    let uniqueDays: number = $derived(
        new Set(dailyTotals.map(d => d.date)).size
    );

    let avgDailySeconds: number = $derived(
        uniqueDays > 0 ? Math.round(totalSeconds / uniqueDays) : 0
    );

    let mostActiveProject: string = $derived(
        projectTotals.length > 0 ? projectTotals[0].project_name : ""
    );

    let dailyColumns: StackedBarColumn[] = $derived.by(() => {
        if (!activeRange.start) return [];

        const map = new Map<string, DailyProjectTotal[]>();
        for (const t of dailyTotals) {
            if (!map.has(t.date)) map.set(t.date, []);
            map.get(t.date)!.push(t);
        }

        // for "all", bound start to earliest data point to avoid rendering decades of empty columns
        let startStr: string = activeRange.start;
        if (selectedRange === "all" && map.size > 0) {
            startStr = [...map.keys()].sort()[0];
        }

        const result: StackedBarColumn[] = [];
        const cursor = new Date(startStr + "T00:00:00");
        const end = new Date(activeRange.end + "T00:00:00");
        while (cursor <= end) {
            const date = formatDateISO(cursor);
            const segs = (map.get(date) ?? []).slice().sort((a, b) => b.total_seconds - a.total_seconds);
            result.push({
                id: date,
                label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
                tooltipLabel: formatDateShort(date),
                segments: segs.map(s => ({
                    key: s.project_id,
                    label: s.project_name,
                    value: s.total_seconds,
                    color: colorMap.get(s.project_id) ?? "var(--gray-40)",
                })),
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        return result;
    });

    let projectItems: BarListItem[] = $derived(
        projectTotals.map(t => ({
            key: t.project_id,
            label: t.project_name,
            value: t.total_seconds,
            color: colorMap.get(t.project_id) ?? "var(--gray-40)",
        }))
    );

    // for "all", clamp displayed start to earliest data point
    let rangeLabel: string = $derived.by(() => {
        if (!activeRange.start || !activeRange.end) return "";
        let startStr: string = activeRange.start;
        if (selectedRange === "all" && dailyTotals.length > 0) {
            startStr = dailyTotals.reduce(
                (min, t) => (t.date < min ? t.date : min),
                dailyTotals[0].date
            );
        }
        return `${formatDateMedium(startStr)} - ${formatDateMedium(activeRange.end)}`;
    });

    const formatTooltip = (v: number): string => formatDuration(v, true);

    async function loadData(): Promise<void> {
        const range = computeDateRange(selectedRange, customStart, customEnd);
        if (!range) return;
        loading = true;
        const [pt, dt] = await Promise.all([
            getProjectTotals(range.start, range.end),
            getDailyProjectTotals(range.start, range.end),
        ]);
        projectTotals = pt;
        dailyTotals = dt;
        activeRange = range;
        loading = false;
    }

    function handleRangeChange(): void {
        saveRangeState({ selectedRange, customStart, customEnd });
        loadData();
    }

    onMount(async () => {
        saveRangeState({ selectedRange, customStart, customEnd });
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        await loadData();
    });
</script>

<main>
    <PageNavigation previousPage="/">
        <div class="nav-actions">
            <DateRangeFilter
                bind:selectedRange
                bind:customStart
                bind:customEnd
                onchange={handleRangeChange}
            />
            <Button
                size="xs"
                title="View Detailed Logs"
                onclick={() => goto("/reports/entries")}
            >
                <Icon path={Menu} size="16" />
                <span>View Logs</span>
            </Button>
        </div>
    </PageNavigation>

    {#if loading}
        <p class="empty">Loading...</p>

    {:else if totalSeconds === 0}
        <EmptyState
            icon={ChartBar}
            title="No data to report"
            description="There's nothing tracked in this range yet. Start a timer and your activity will show up here."
            actionLabel="Go to Timer"
            actionIcon={Alarm}
            onaction={() => goto("/")}
        />

    {:else}
        <div class="content">
            <SummaryStats
                {totalSeconds}
                {avgDailySeconds}
                {mostActiveProject}
                totalDays={uniqueDays}
            />
            <StackedBarChart
                title="Daily Activities"
                {rangeLabel}
                columns={dailyColumns}
                formatValue={formatTooltip}
                maxBarHeight={200}
            />
            <BarList items={projectItems} formatValue={formatTooltip} />
        </div>
    {/if}
</main>

<style>
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
        margin-top: 40px;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    @container app (min-width: 600px) {
        .content {
            display: grid;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            grid-template-rows: auto var(--chart-h);
            grid-template-areas:
                "stats stats"
                "chart bars";
            gap: 12px;
        }

        .content :global(.stats) {
            grid-area: stats;
            margin-bottom: 0;
        }

        .content :global(.chart-section) {
            grid-area: chart;
        }

        .content :global(.bar-list) {
            grid-area: bars;
            min-height: 0;
        }
    }

    .content {
        --chart-h: 300px;
    }
</style>
