<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Renders the project groups + entry rows for a single day. Header-less;
    intended for the right-hand detail panel of a master/detail layout where
    the date is already shown in the master column. App usage rows, when
    given, become a per-app bar under each entry that recorded any; app
    colors are ranked across the whole day so an app keeps one color in
    every row.

    @param {ReportEntry[]} entries - entries belonging to this day.
    @param {Map<number, string>} colorMap - project ID to color mapping.
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for entry.
    @param {(entry: ReportEntry) => void} ondelete - trigger delete for entry.
    @param {Map<number, AppUsageRow[]>} [usageByTimer] - active app segments keyed by timer id.
    @param {Map<string, string>} [icons] - app id to png data uri for the usage tooltips.
    @param {(entry: ReportEntry, segment: StackedBarSegment) => void} [ondeleteusage] - confirm removing one app's usage from an entry.
-->
<script lang="ts">
    import EntryRow from "./entry-row.svelte";
    import { formatDuration } from "$lib/helpers/format";
    import { APP_COLORS } from "$lib/helpers/colors";
    import {
        localDateTimeMs,
        sumAppSeconds,
        mergeAppSeconds,
        rankAppColors,
        usageSegments,
    } from "$lib/helpers/app-usage";
    import type { ReportEntry, ProjectEntryGroup, AppUsageRow, AppSeconds, StackedBarSegment } from "$lib/types";

    type Props = {
        entries: ReportEntry[];
        colorMap: Map<number, string>;
        onedit: (entry: ReportEntry) => void;
        ondelete: (entry: ReportEntry) => void;
        usageByTimer?: Map<number, AppUsageRow[]>;
        icons?: Map<string, string>;
        ondeleteusage?: (entry: ReportEntry, segment: StackedBarSegment) => void;
    };

    const NO_USAGE: Map<number, AppUsageRow[]> = new Map();
    const NO_ICONS: Map<string, string> = new Map();

    let {
        entries,
        colorMap,
        onedit,
        ondelete,
        usageByTimer = NO_USAGE,
        icons = NO_ICONS,
        ondeleteusage,
    }: Props = $props();

    let projectGroups: ProjectEntryGroup[] = $derived.by(() => {
        const map = new Map<number, ProjectEntryGroup>();
        for (const e of entries) {
            if (!map.has(e.project_id)) {
                map.set(e.project_id, {
                    projectId: e.project_id,
                    projectName: e.project_name,
                    entries: [],
                    total: 0,
                });
            }
            const g = map.get(e.project_id)!;
            g.entries.push(e);
            g.total += e.total;
        }
        return Array.from(map.values());
    });

    // per-app seconds inside each entry's own slice of its timer
    let appsByEntry: Map<number, AppSeconds[]> = $derived.by(() => {
        const out = new Map<number, AppSeconds[]>();
        for (const e of entries) {
            const rows = usageByTimer.get(e.timer_id);
            if (!rows || !e.end) continue;
            const apps = sumAppSeconds(rows, [
                localDateTimeMs(e.date, e.start),
                localDateTimeMs(e.date, e.end),
            ]);
            if (apps.length > 0) out.set(e.entry_id, apps);
        }
        return out;
    });

    let dayColors: Map<string, string> = $derived(
        rankAppColors(mergeAppSeconds(appsByEntry.values()), APP_COLORS.length)
    );

    function usageFor(entry: ReportEntry): StackedBarSegment[] {
        const apps = appsByEntry.get(entry.entry_id);
        return apps ? usageSegments(apps, dayColors, entry.total) : [];
    }

    function usageDeleter(entry: ReportEntry): ((segment: StackedBarSegment) => void) | undefined {
        const remove = ondeleteusage;
        return remove && ((segment: StackedBarSegment) => remove(entry, segment));
    }
</script>

<div class="day-detail">
    {#each projectGroups as pg (pg.projectId)}
        {@const color = colorMap.get(pg.projectId) ?? "var(--gray-40)"}
        <div class="project-section" style:--project-color={color}>
            <div class="project-header">
                <span class="project-name">{pg.projectName}</span>
                <span class="project-total">{formatDuration(pg.total)}</span>
            </div>
            <div class="project-entries">
                {#each pg.entries as entry (entry.entry_id)}
                    <EntryRow
                        {entry}
                        usage={usageFor(entry)}
                        {icons}
                        onedit={() => onedit(entry)}
                        ondelete={() => ondelete(entry)}
                        ondeleteusage={usageDeleter(entry)}
                    />
                {/each}
            </div>
        </div>
    {/each}
</div>

<style>
    .day-detail {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .project-section {
        border-left: 2px solid color-mix(in srgb, var(--project-color) 55%, transparent);
        overflow: hidden;
    }

    .project-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        background: color-mix(in srgb, var(--project-color) 7%, transparent);
    }

    .project-name {
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--project-color);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .project-total {
        font-size: 0.68rem;
        color: color-mix(in srgb, var(--project-color) 70%, var(--gray-20));
        font-variant-numeric: tabular-nums;
    }

    .project-entries {
        padding-left: 10px;
    }
</style>
