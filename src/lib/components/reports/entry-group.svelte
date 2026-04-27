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
        <span class="count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        <Icon
            path={expanded ? ArrowDropup : ArrowDropdown}
            size="18"
            fill="var(--gray-40)"
        />
    </button>
    {#if expanded}
        <div class="day-entries">
            {#each projectGroups as pg (pg.projectId)}
                <div class="project-section">
                    <div class="project-header">
                        <span
                            class="dot"
                            style:background-color={colorMap.get(pg.projectId) ?? "var(--gray-40)"}
                        ></span>
                        <span class="project-name">{pg.projectName}</span>
                        <span class="project-total">{formatDuration(pg.total)}</span>
                    </div>
                    {#each pg.entries as entry (entry.entry_id)}
                        <EntryRow
                            {entry}
                            {colorMap}
                            onedit={() => onedit(entry)}
                            ondelete={() => ondelete(entry)}
                        />
                    {/each}
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
        padding: 0 0 4px 0;
    }

    .project-section {
        margin-bottom: 4px;
    }

    .project-section:last-child {
        margin-bottom: 0;
    }

    .project-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
    }

    .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .project-name {
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--gray-20);
        flex: 1;
    }

    .project-total {
        font-size: 0.68rem;
        color: var(--gray-40);
    }
</style>
