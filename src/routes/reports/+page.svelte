<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import SummaryStats from "$lib/components/reports/summary-stats.svelte";
    import BarList from "$lib/components/charts/bar-list.svelte";
    import StackedBarChart from "$lib/components/charts/stacked-bar-chart.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import AppIcon from "$lib/components/app-icon.svelte";
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import DateRangeFilter from "$lib/components/date-range-filter.svelte";
    import { Menu, ChartBar, Alarm } from "$lib/icons";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getProjects, getDailyProjectTotals, getProjectTotals, getAppUsageRows } from "$lib/db";
    import { getAppIcons, usageTrackingSupported } from "$lib/usage";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import {
        dailyAppSeconds,
        mergeAppSeconds,
        rankAppColors,
        usageSegments,
        OTHER_KEY,
        UNTRACKED_KEY,
    } from "$lib/helpers/app-usage";
    import { formatDuration, formatDateISO, formatDateShort, formatDateMedium } from "$lib/helpers/format";
    import { computeDateRange } from "$lib/helpers/date-range";
    import { loadRangeState, saveRangeState } from "$lib/helpers/range-storage";
    import type {
        Project,
        ProjectTotal,
        DailyProjectTotal,
        AppUsageRow,
        AppSeconds,
        StackedBarColumn,
        StackedBarSegment,
        BarListItem,
    } from "$lib/types";

    type ReportView = "projects" | "apps";

    const VIEW_OPTIONS: { value: ReportView; label: string }[] = [
        { value: "projects", label: "Projects" },
        { value: "apps", label: "Apps" },
    ];

    const persisted = loadRangeState();
    let selectedRange: string = $state(persisted.selectedRange ?? "7");
    let customStart: string = $state(persisted.customStart ?? "");
    let customEnd: string = $state(persisted.customEnd ?? "");

    let projects: Project[] = $state([]);
    let projectTotals: ProjectTotal[] = $state([]);
    let dailyTotals: DailyProjectTotal[] = $state([]);
    let usageRows: AppUsageRow[] = $state([]);
    let icons: Map<string, string> = $state(new Map());
    let activeRange: { start: string; end: string } = $state({ start: "", end: "" });
    let colorMap: Map<number, string> = $state(new Map());
    let loading: boolean = $state(true);
    let view: ReportView = $state("projects");
    let usageSupported: boolean = $state(false);

    let totalSeconds: number = $derived(
        projectTotals.reduce((s, t) => s + t.total_seconds, 0)
    );

    let uniqueDays: number = $derived(
        new Set(dailyTotals.map(d => d.date)).size
    );

    let avgDailySeconds: number = $derived(
        uniqueDays > 0 ? Math.round(totalSeconds / uniqueDays) : 0
    );

    let dailyByDate: Map<string, DailyProjectTotal[]> = $derived.by(() => {
        const map = new Map<string, DailyProjectTotal[]>();
        for (const t of dailyTotals) {
            if (!map.has(t.date)) map.set(t.date, []);
            map.get(t.date)!.push(t);
        }
        return map;
    });

    // for "all", bound the start to the earliest data point to avoid
    // rendering decades of empty columns
    let columnStart: string = $derived.by(() => {
        if (selectedRange !== "all" || dailyByDate.size === 0) return activeRange.start;
        return [...dailyByDate.keys()].sort()[0];
    });

    let dailyApps: Map<string, AppSeconds[]> = $derived(
        activeRange.start
            ? dailyAppSeconds(usageRows, activeRange.start, activeRange.end)
            : new Map()
    );

    let appTotals: AppSeconds[] = $derived(mergeAppSeconds(dailyApps.values()));
    let appColors: Map<string, string> = $derived(rankAppColors(appTotals));
    let otherCount: number = $derived(Math.max(0, appTotals.length - appColors.size));

    let mostActive: string = $derived.by(
        () => (view === "apps" ? appTotals[0]?.app_name : projectTotals[0]?.project_name) ?? ""
    );

    function buildColumns(segmentsFor: (date: string) => StackedBarSegment[]): StackedBarColumn[] {
        if (!activeRange.start) return [];
        const result: StackedBarColumn[] = [];
        const cursor = new Date(columnStart + "T00:00:00");
        const end = new Date(activeRange.end + "T00:00:00");
        while (cursor <= end) {
            const date = formatDateISO(cursor);
            result.push({
                id: date,
                label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
                tooltipLabel: formatDateShort(date),
                segments: segmentsFor(date),
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        return result;
    }

    let projectColumns: StackedBarColumn[] = $derived(
        buildColumns(date =>
            (dailyByDate.get(date) ?? [])
                .slice()
                .sort((a, b) => b.total_seconds - a.total_seconds)
                .map(s => ({
                    key: s.project_id,
                    label: s.project_name,
                    value: s.total_seconds,
                    color: colorMap.get(s.project_id) ?? "var(--gray-40)",
                }))
        )
    );

    let appColumns: StackedBarColumn[] = $derived(
        buildColumns(date => {
            const dayTotal = (dailyByDate.get(date) ?? []).reduce((s, t) => s + t.total_seconds, 0);
            return usageSegments(dailyApps.get(date) ?? [], appColors, dayTotal);
        })
    );

    let dailyColumns: StackedBarColumn[] = $derived.by(() => (view === "apps" ? appColumns : projectColumns));

    let projectItems: BarListItem[] = $derived(
        projectTotals.map(t => ({
            key: t.project_id,
            label: t.project_name,
            value: t.total_seconds,
            color: colorMap.get(t.project_id) ?? "var(--gray-40)",
        }))
    );

    let appSegments: StackedBarSegment[] = $derived(usageSegments(appTotals, appColors, totalSeconds));
    let appItems: BarListItem[] = $derived(appSegments.filter(s => s.key !== UNTRACKED_KEY));
    let untracked: BarListItem | undefined = $derived(appSegments.find(s => s.key === UNTRACKED_KEY));

    let rangeLabel: string = $derived(
        columnStart && activeRange.end
            ? `${formatDateMedium(columnStart)} - ${formatDateMedium(activeRange.end)}`
            : ""
    );

    const formatTooltip = (v: number): string => formatDuration(v, true);

    async function loadData(): Promise<void> {
        const range = computeDateRange(selectedRange, customStart, customEnd);
        if (!range) return;
        loading = true;
        const [pt, dt, ur] = await Promise.all([
            getProjectTotals(range.start, range.end),
            getDailyProjectTotals(range.start, range.end),
            getAppUsageRows(range.start, range.end),
        ]);
        projectTotals = pt;
        dailyTotals = dt;
        usageRows = ur;
        activeRange = range;
        loading = false;
        icons = await getAppIcons([...appColors.keys()]);
    }

    function handleRangeChange(): void {
        saveRangeState({ selectedRange, customStart, customEnd });
        loadData();
    }

    onMount(async () => {
        saveRangeState({ selectedRange, customStart, customEnd });
        usageTrackingSupported().then(v => (usageSupported = v));
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
        await loadData();
    });
</script>

{#snippet viewToggle()}
    <span class="view-toggle">
        <SegmentedControl
            options={VIEW_OPTIONS}
            size="xs"
            value={view}
            onchange={(v) => (view = v as ReportView)}
        />
    </span>
{/snippet}

{#snippet appIcon(item: BarListItem)}
    <AppIcon
        name={item.label}
        src={icons.get(String(item.key))}
        badge={item.key === OTHER_KEY ? `+${otherCount}` : undefined}
        size={18}
    />
{/snippet}

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
                {mostActive}
                totalDays={uniqueDays}
            />
            <StackedBarChart
                title="Daily Activities"
                controls={usageSupported ? viewToggle : undefined}
                {rangeLabel}
                columns={dailyColumns}
                formatValue={formatTooltip}
                maxBarHeight={200}
            />
            {#if view === "apps"}
                <BarList
                    title="Apps"
                    items={appItems}
                    itemIcon={appIcon}
                    remainder={untracked}
                    emptyMessage="No app usage in this range. Turn on app tracking per project in Settings to see which apps you spend time in."
                    formatValue={formatTooltip}
                />
            {:else}
                <BarList title="Projects" items={projectItems} formatValue={formatTooltip} />
            {/if}
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

    .view-toggle {
        --field-bg: var(--color-background);
        display: inline-flex;
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
