<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Vertical list of items, each with a label, value, and a color-filled
    horizontal bar showing the item's share of the total. An optional
    remainder row closes the list under a divider with a swatch instead of
    a bar, for time that belongs to no item.

    @param {BarListItem[]} items - the data rows to render.
    @param {string} [title] - optional section heading rendered above the list.
    @param {'left' | 'right'} [titleAlign='left'] - alignment of the title.
    @param {number} [total] - explicit denominator for percentages; defaults to sum of values.
    @param {(value: number) => string} [formatValue] - value formatter shown beside each label.
    @param {Snippet<[BarListItem]>} [itemIcon] - optional icon rendered before each label.
    @param {BarListItem} [remainder] - optional last row, under a divider and without a bar.
    @param {string} [emptyMessage] - shown in place of the rows when there are no items; without it the section is not rendered.
-->
<script lang="ts">
    import type { Snippet } from "svelte";
    import type { BarListItem } from "$lib/types";

    type Props = {
        items: BarListItem[];
        title?: string;
        titleAlign?: 'left' | 'right';
        total?: number;
        formatValue?: (value: number) => string;
        itemIcon?: Snippet<[BarListItem]>;
        remainder?: BarListItem;
        emptyMessage?: string;
    };

    let {
        items,
        title,
        titleAlign = 'left',
        total,
        formatValue = (v: number) => String(v),
        itemIcon,
        remainder,
        emptyMessage,
    }: Props = $props();

    let denominator: number = $derived(
        total ?? items.reduce((sum, item) => sum + item.value, 0)
    );

    function pct(value: number): number {
        return denominator > 0 ? (value / denominator) * 100 : 0;
    }
</script>

{#if items.length > 0 || emptyMessage}
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
                        {#if itemIcon}{@render itemIcon(item)}{/if}
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
            {:else}
                <p class="empty">{emptyMessage}</p>
            {/each}
            {#if remainder}
                <div class="remainder">
                    <span class="swatch" style:background-color={remainder.color}></span>
                    <span class="name muted">{remainder.label}</span>
                    <span class="value">{formatValue(remainder.value)}</span>
                </div>
            {/if}
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

    .name.muted {
        color: var(--gray-30);
    }

    .value {
        font-size: 0.75rem;
        color: var(--gray-30);
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
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

    .empty {
        margin: 0;
        padding-right: 6px;
        font-size: 0.72rem;
        line-height: 1.5;
        color: var(--gray-30);
    }

    .remainder {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid var(--gray-70);
    }

    .swatch {
        width: 18px;
        height: 6px;
        border-radius: 3px;
        flex-shrink: 0;
    }
</style>
