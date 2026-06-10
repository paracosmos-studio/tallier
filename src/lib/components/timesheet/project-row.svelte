<!--
    @component
    Project row inside a timesheet day. Collapsed view shows project name and
    rounded total. Expanded view appends individual entry rows with edit/hide
    actions.

    @param {string} projectName - display name of the project.
    @param {number} totalRounded - sum of rounded entry durations (seconds).
    @param {ReportEntry[]} entries - entries belonging to this project on this day.
    @param {string} color - the project's color.
    @param {Map<number, string>} colorMap - project ID to color map for entry rows.
    @param {boolean} expanded - whether the row shows individual entries.
    @param {Set<number>} hiddenIds - entry IDs excluded from totals.
    @param {() => void} ontoggle - toggle expand/collapse callback.
    @param {(entryId: number) => void} [onhide] - toggle hidden state for an entry (eye icon).
    @param {(entryId: number) => void} [ondelete] - remove an entry (trash icon).
    @param {(entry: ReportEntry) => void} onedit - open edit dialog for an entry.
-->
<script lang="ts">
    import EntryRow from "$lib/components/reports/entry-row.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { ArrowDropdown, ArrowDropup } from "$lib/icons";
    import { formatDuration } from "$lib/helpers/format";
    import type { ReportEntry } from "$lib/types";

    type Props = {
        projectName: string;
        totalRounded: number;
        entries: ReportEntry[];
        color: string;
        colorMap: Map<number, string>;
        expanded: boolean;
        hiddenIds: Set<number>;
        ontoggle: () => void;
        onhide?: (entryId: number) => void;
        ondelete?: (entryId: number) => void;
        onedit: (entry: ReportEntry) => void;
    };

    let {
        projectName,
        totalRounded,
        entries,
        color,
        colorMap,
        expanded,
        hiddenIds,
        ontoggle,
        onhide,
        ondelete,
        onedit,
    }: Props = $props();
</script>

<div class="project-row" style:--project-color={color} class:expanded>
    <button class="head" onclick={ontoggle} aria-expanded={expanded}>
        <span class="name">{projectName}</span>
        <span class="total">{formatDuration(totalRounded)}</span>
        <Icon
            path={expanded ? ArrowDropup : ArrowDropdown}
            size="16"
            fill="var(--gray-40)"
        />
    </button>
    {#if expanded}
        <div class="entries">
            {#each entries as entry (entry.entry_id)}
                <EntryRow
                    {entry}
                    hidden={hiddenIds.has(entry.entry_id)}
                    onedit={() => onedit(entry)}
                    onhide={onhide ? () => onhide(entry.entry_id) : undefined}
                    ondelete={ondelete ? () => ondelete(entry.entry_id) : undefined}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    .project-row {
        border-left: 2px solid color-mix(in srgb, var(--project-color) 55%, transparent);
        background: color-mix(in srgb, var(--project-color) 6%, transparent);
        border-radius: 0 4px 4px 0;
        overflow: hidden;
    }

    .head {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 10px;
        background: none;
        border: none;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
        transition: all 0.12s ease;
    }

    .head:hover {
        background: color-mix(in srgb, var(--project-color) 10%, transparent);
    }

    .name {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--project-color);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .total {
        font-size: 0.75rem;
        color: color-mix(in srgb, var(--project-color) 70%, var(--gray-20));
        font-variant-numeric: tabular-nums;
    }

    .entries {
        padding: 6px 0 6px 10px;
        border-top: 1px solid color-mix(in srgb, var(--project-color) 15%, transparent);
    }
</style>
