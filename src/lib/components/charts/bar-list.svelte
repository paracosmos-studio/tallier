<!--
    @component
    Vertical list of items, each with a label, value, and a color-filled
    horizontal bar showing the item's share of the total.

    @param {BarListItem[]} items - the data rows to render.
    @param {string} [title] - optional section heading rendered above the list.
    @param {number} [total] - explicit denominator for percentages; defaults to sum of values.
    @param {(value: number) => string} [formatValue] - value formatter shown beside each label.
-->
<script lang="ts">
    import type { BarListItem } from "$lib/types";

    type Props = {
        items: BarListItem[];
        title?: string;
        total?: number;
        formatValue?: (value: number) => string;
    };

    let {
        items,
        title,
        total,
        formatValue = (v: number) => String(v),
    }: Props = $props();

    let denominator: number = $derived(
        total ?? items.reduce((sum, item) => sum + item.value, 0)
    );

    function pct(value: number): number {
        return denominator > 0 ? (value / denominator) * 100 : 0;
    }
</script>

{#if items.length > 0}
    <section class="bar-list">
        {#if title}
            <h3>{title}</h3>
        {/if}
        {#each items as item (item.key)}
            <div class="row">
                <div class="info">
                    <span class="name">{item.label}</span>
                    <span class="value">{formatValue(item.value)}</span>
                </div>
                <div class="track">
                    <div
                        class="fill"
                        style:width="{pct(item.value)}%"
                        style:background-color={item.color}
                    ></div>
                </div>
            </div>
        {/each}
    </section>
{/if}

<style>
    .bar-list {
        margin-bottom: 16px;
    }

    h3 {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--gray-30);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin: 0 0 8px 0;
    }

    .row {
        margin-bottom: 8px;
    }

    .info {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 3px;
    }

    .name {
        font-size: 0.8rem;
        color: var(--gray-10);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .value {
        font-size: 0.75rem;
        color: var(--gray-30);
        flex-shrink: 0;
    }

    .track {
        height: 6px;
        background: var(--gray-80);
        border-radius: 3px;
        overflow: hidden;
    }

    .fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
        min-width: 2px;
    }
</style>
