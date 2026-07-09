<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Vertical list of items, each with a label, value, and a color-filled
    horizontal bar showing the item's share of the total.

    @param {BarListItem[]} items - the data rows to render.
    @param {string} [title] - optional section heading rendered above the list.
    @param {'left' | 'right'} [titleAlign='left'] - alignment of the title.
    @param {number} [total] - explicit denominator for percentages; defaults to sum of values.
    @param {(value: number) => string} [formatValue] - value formatter shown beside each label.
-->
<script lang="ts">
    import type { BarListItem } from "$lib/types";

    type Props = {
        items: BarListItem[];
        title?: string;
        titleAlign?: 'left' | 'right';
        total?: number;
        formatValue?: (value: number) => string;
    };

    let {
        items,
        title,
        titleAlign = 'left',
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
            <header class:right={titleAlign === 'right'}>
                <h3>{title}</h3>
            </header>
        {/if}
        <div class="rows">
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
        </div>
    </section>
{/if}

<style>
    .bar-list {
        display: flex;
        flex-direction: column;
        padding: 12px 0 12px 14px;
        background: var(--gray-80);
        border-radius: 6px;
        min-height: 0;
        box-sizing: border-box;
    }

    header {
        display: flex;
        margin-bottom: 10px;
        padding-right: 14px;
        flex-shrink: 0;
    }

    header.right {
        justify-content: flex-end;
    }

    h3 {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--gray-30);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin: 0;
    }

    .rows {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 8px;
    }

    .rows::-webkit-scrollbar {
        width: 6px;
    }

    .rows::-webkit-scrollbar-track {
        background: transparent;
    }

    .rows::-webkit-scrollbar-thumb {
        background: var(--gray-60);
        border-radius: 3px;
    }

    .rows::-webkit-scrollbar-thumb:hover {
        background: var(--gray-50);
    }

    .row {
        margin-bottom: 8px;
    }

    .row:last-child {
        margin-bottom: 0;
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
        background: rgba(0, 0, 0, 0.3);
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
