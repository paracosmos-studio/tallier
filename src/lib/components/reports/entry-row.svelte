<!--
    @component
    Display-only entry row with edit and optional delete/hide action buttons.
    Each action button only renders when its callback is provided.

    @param {ReportEntry} entry - the entry data to display.
    @param {Map<number, string>} colorMap - project ID to color mapping.
    @param {() => void} onedit - callback to open edit dialog.
    @param {() => void} [ondelete] - callback to trigger delete confirmation.
    @param {boolean} [hidden=false] - whether the entry is currently hidden from totals.
    @param {() => void} [onhide] - callback to toggle the hidden state.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Edit, Delete, VisibilityOff } from "$lib/icons";
    import { formatDuration, formatTimeOfDay } from "$lib/format";
    import type { ReportEntry } from "$lib/types";

    type Props = {
        entry: ReportEntry;
        colorMap: Map<number, string>;
        onedit: () => void;
        ondelete?: () => void;
        hidden?: boolean;
        onhide?: () => void;
    };

    let { entry, colorMap, onedit, ondelete, hidden = false, onhide }: Props = $props();
</script>

<div class="row" class:hidden>
    <span class="info">
        <span class="time-line">
            <span class="range">
                {formatTimeOfDay(entry.start)}{entry.end ? ` - ${formatTimeOfDay(entry.end)}` : ""}
            </span>
            {#if entry.segment === "first"}
                <span class="cont">continues</span>
            {:else if entry.segment === "second"}
                <span class="cont">continued</span>
            {/if}
            <span class="sep">·</span>
            <span class="duration">{formatDuration(entry.total)}</span>
        </span>
        {#if entry.title}
            <span class="summary">{entry.title}</span>
        {/if}
    </span>
    <span class="actions">
        <button class="act edit" title="Edit entry" onclick={onedit}>
            <Icon path={Edit} size="13" fill="currentColor" />
        </button>
        {#if onhide}
            <button
                class="act hide"
                class:on={hidden}
                title={hidden ? "Include in totals" : "Exclude from totals"}
                onclick={onhide}
            >
                <Icon path={VisibilityOff} size="13" fill="currentColor" />
            </button>
        {/if}
        {#if ondelete}
            <button class="act del" title="Delete entry" onclick={ondelete}>
                <Icon path={Delete} size="13" fill="currentColor" />
            </button>
        {/if}
    </span>
</div>

<style>
    .row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px 6px 0px;
        transition: opacity 0.15s ease;
    }

    .row.hidden .info {
        opacity: 0.4;
        text-decoration: line-through;
        text-decoration-color: var(--gray-40);
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .time-line {
        font-size: 0.78rem;
        color: var(--gray-10);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .duration {
        color: var(--gray-20);
    }

    .cont {
        margin-left: 4px;
        padding: 1px 5px;
        background: color-mix(in srgb, var(--yellow) 18%, transparent);
        color: var(--gray-10);
        border-radius: 3px;
        font-size: 0.62rem;
        letter-spacing: 0.02em;
    }

    .sep {
        margin: 0 4px;
        color: var(--gray-40);
        opacity: 0.6;
    }

    .summary {
        font-size: 0.7rem;
        color: var(--gray-20);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        transition: color 0.15s ease;
    }

    .act.edit:hover {
        color: var(--yellow);
    }

    .act.del:hover {
        color: var(--red);
    }

    .act.hide:hover,
    .act.hide.on {
        color: var(--gray-10);
    }
</style>
