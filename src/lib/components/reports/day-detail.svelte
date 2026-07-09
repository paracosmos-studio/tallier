<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Renders the project groups + entry rows for a single day. Header-less;
    intended for the right-hand detail panel of a master/detail layout where
    the date is already shown in the master column.

    @param {ReportEntry[]} entries - entries belonging to this day.
    @param {Map<number, string>} colorMap - project ID to color mapping.
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for entry.
    @param {(entry: ReportEntry) => void} ondelete - trigger delete for entry.
-->
<script lang="ts">
    import EntryRow from "./entry-row.svelte";
    import { formatDuration } from "$lib/helpers/format";
    import type { ReportEntry, ProjectEntryGroup } from "$lib/types";

    type Props = {
        entries: ReportEntry[];
        colorMap: Map<number, string>;
        onedit: (entry: ReportEntry) => void;
        ondelete: (entry: ReportEntry) => void;
    };

    let { entries, colorMap, onedit, ondelete }: Props = $props();

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
                        onedit={() => onedit(entry)}
                        ondelete={() => ondelete(entry)}
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
