<!--
    @component
    Display-only entry row with edit and delete action buttons.

    @param {ReportEntry} entry - the entry data to display.
    @param {Map<number, string>} colorMap - project ID to color mapping.
    @param {() => void} onedit - callback to open edit dialog.
    @param {() => void} ondelete - callback to trigger delete confirmation.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Edit, Delete } from "$lib/icons";
    import { formatDuration, formatTimeOfDay } from "$lib/format";
    import type { ReportEntry } from "$lib/types";

    type Props = {
        entry: ReportEntry;
        colorMap: Map<number, string>;
        onedit: () => void;
        ondelete: () => void;
    };

    let { entry, colorMap, onedit, ondelete }: Props = $props();
</script>

<div class="row">
    <span class="info">
        <span class="title">{entry.title || "Untitled"}</span>
        <span class="time">
            {formatTimeOfDay(entry.start)}{entry.end ? ` - ${formatTimeOfDay(entry.end)}` : ""}
            <span class="sep">|</span>
            {formatDuration(entry.total)}
        </span>
    </span>
    <span class="actions">
        <button class="act edit" title="Edit entry" onclick={onedit}>
            <Icon path={Edit} size="13" fill="currentColor" />
        </button>
        <button class="act del" title="Delete entry" onclick={ondelete}>
            <Icon path={Delete} size="13" fill="currentColor" />
        </button>
    </span>
</div>

<style>
    .row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-bottom: 1px solid var(--gray-80);
    }

    .row:last-child {
        border-bottom: none;
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .title {
        font-size: 0.78rem;
        color: var(--gray-10);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .time {
        font-size: 0.68rem;
        color: var(--gray-40);
    }

    .sep {
        margin: 0 3px;
        opacity: 0.4;
    }

    .actions {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
    }

    .act {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--gray-40);
        border-radius: 3px;
        display: flex;
        transition: all 0.15s ease;
    }

    .act.edit:hover {
        color: var(--yellow);
    }

    .act.del:hover {
        color: var(--red);
    }
</style>
