<!--
    @component
    Collapsible day group with entries sub-grouped by project.

    @param {string} date - the date string (YYYY-MM-DD).
    @param {ReportEntry[]} entries - entries for this day.
    @param {boolean} expanded - whether the group is expanded.
    @param {Map<number, string>} colorMap - project ID to color mapping.
    @param {() => void} ontoggle - toggle expand/collapse callback.
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for entry.
    @param {(entry: ReportEntry) => void} ondelete - trigger delete for entry.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { ArrowDropdown, ArrowDropup } from "$lib/icons";
    import EntryRow from "./entry-row.svelte";
    import { formatDuration, formatDateLong } from "$lib/format";
    import type { ReportEntry, ProjectEntryGroup } from "$lib/types";

    type Props = {
        date: string;
        entries: ReportEntry[];
        expanded: boolean;
        colorMap: Map<number, string>;
        ontoggle: () => void;
        onedit: (entry: ReportEntry) => void;
        ondelete: (entry: ReportEntry) => void;
    };

    let { date, entries, expanded, colorMap, ontoggle, onedit, ondelete }: Props = $props();

    let dayTotal: number = $derived(
        entries.reduce((s, e) => s + e.total, 0)
    );

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

<section class="group">
    <button class="header" onclick={ontoggle}>
        <span class="date">{formatDateLong(date)}</span>
        <span class="total">{formatDuration(dayTotal)}</span>
        {#if !expanded}
            <span class="count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        {/if}
        <Icon
            path={expanded ? ArrowDropup : ArrowDropdown}
            size="18"
            fill="var(--gray-40)"
        />
    </button>
    {#if expanded}
        <div class="day-entries">
            {#each projectGroups as pg (pg.projectId)}
                {@const color = colorMap.get(pg.projectId) ?? "var(--gray-40)"}
                <div
                    class="project-section"
                    style:--project-color={color}
                >
                    <div class="project-header">
                        <span class="project-name">{pg.projectName}</span>
                        <span class="project-total">{formatDuration(pg.total)}</span>
                    </div>
                    <div class="project-entries">
                        {#each pg.entries as entry (entry.entry_id)}
                            <EntryRow
                                {entry}
                                {colorMap}
                                onedit={() => onedit(entry)}
                                ondelete={() => ondelete(entry)}
                            />
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</section>

<style>
    .group {
        border-bottom: 1px solid var(--gray-80);
    }

    .group:last-child {
        border-bottom: none;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 4px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: all 0.15s ease;
    }

    .header:hover {
        background: var(--gray-80);
    }

    .date {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--gray-10);
        flex: 1;
    }

    .total {
        font-size: 0.75rem;
        color: var(--gray-20);
    }

    .count {
        font-size: 0.7rem;
        color: var(--gray-40);
    }

    .day-entries {
        padding: 0 0 8px 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
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
