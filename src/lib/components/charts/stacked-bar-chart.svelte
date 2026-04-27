<!--
    @component
    Generic stacked vertical bar chart with hover/focus tooltip showing
    color-coded segments and the column total.

    @param {StackedBarColumn[]} columns - the data columns to render.
    @param {string} [title] - optional section heading rendered above the chart.
    @param {(value: number) => string} [formatValue] - tooltip value formatter.
    @param {number} [maxBarHeight=120] - maximum bar height in pixels.
-->
<script lang="ts">
    import type { StackedBarColumn } from "$lib/types";

    type Props = {
        columns: StackedBarColumn[];
        title?: string;
        formatValue?: (value: number) => string;
        maxBarHeight?: number;
    };

    let {
        columns,
        title,
        formatValue = (v: number) => String(v),
        maxBarHeight = 120,
    }: Props = $props();

    let totals: number[] = $derived(
        columns.map(c => c.segments.reduce((s, seg) => s + seg.value, 0))
    );

    let maxTotal: number = $derived(Math.max(...totals, 1));

    let labelStep: number = $derived.by(() => {
        const count = columns.length;
        if (count <= 14) return 1;
        if (count <= 45) return 3;
        if (count <= 120) return 7;
        return 14;
    });

    function barHeight(total: number): number {
        return (total / maxTotal) * maxBarHeight;
    }

    function segmentHeight(value: number, total: number): number {
        return total > 0 ? (value / total) * barHeight(total) : 0;
    }

    let hovered: { col: StackedBarColumn; total: number } | null = $state(null);
    let tooltipX: number = $state(0);
    let tooltipY: number = $state(0);

    function showTooltip(col: StackedBarColumn, total: number, e: MouseEvent): void {
        hovered = { col, total };
        tooltipX = e.clientX;
        tooltipY = e.clientY;
    }

    function moveTooltip(e: MouseEvent): void {
        tooltipX = e.clientX;
        tooltipY = e.clientY;
    }

    function hideTooltip(): void {
        hovered = null;
    }

    let flipX: boolean = $derived(
        typeof window !== "undefined" && tooltipX > window.innerWidth - 220
    );
    let flipY: boolean = $derived(
        typeof window !== "undefined" && tooltipY > window.innerHeight - 180
    );

    function ariaLabel(col: StackedBarColumn, total: number): string {
        const parts = col.segments.map(s => `${s.label} ${formatValue(s.value)}`).join(", ");
        return `${col.tooltipLabel}: ${parts}. Total ${formatValue(total)}`;
    }
</script>

{#if columns.length > 0}
    <section class="chart-section">
        {#if title}
            <h3>{title}</h3>
        {/if}
        <div class="chart" style:height="{maxBarHeight + 28}px">
            {#each columns as col, i (col.id)}
                <div
                    class="col"
                    role="img"
                    aria-label={ariaLabel(col, totals[i])}
                    onmouseenter={(e) => showTooltip(col, totals[i], e)}
                    onmousemove={moveTooltip}
                    onmouseleave={hideTooltip}
                    onfocus={(e) => showTooltip(col, totals[i], e as unknown as MouseEvent)}
                    onblur={hideTooltip}
                >
                    <div class="stack" style:height="{barHeight(totals[i])}px">
                        {#each col.segments as seg (seg.key)}
                            <div
                                class="seg"
                                style:height="{segmentHeight(seg.value, totals[i])}px"
                                style:background-color={seg.color}
                            ></div>
                        {/each}
                    </div>
                    {#if i % labelStep === 0}
                        <span class="lbl">{col.label}</span>
                    {:else}
                        <span class="lbl"></span>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    {#if hovered}
        <div
            class="tooltip"
            style:left="{tooltipX + (flipX ? -12 : 12)}px"
            style:top="{tooltipY + (flipY ? -12 : 12)}px"
            style:transform="translate({flipX ? '-100%' : '0'}, {flipY ? '-100%' : '0'})"
        >
            <div class="tip-date">{hovered.col.tooltipLabel}</div>
            <ul class="tip-list">
                {#each hovered.col.segments as seg (seg.key)}
                    <li>
                        <span class="dot" style:background-color={seg.color}></span>
                        <span class="name">{seg.label}</span>
                        <span class="time">{formatValue(seg.value)}</span>
                    </li>
                {/each}
            </ul>
            <div class="tip-total">
                <span>Total</span>
                <span>{formatValue(hovered.total)}</span>
            </div>
        </div>
    {/if}
{/if}

<style>
    .chart-section {
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

    .chart {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .col {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1 0 8px;
        min-width: 8px;
        max-width: 32px;
    }

    .stack {
        width: 100%;
        display: flex;
        flex-direction: column-reverse;
        border-radius: 2px 2px 0 0;
        overflow: hidden;
    }

    .seg {
        width: 100%;
        min-height: 1px;
        transition: height 0.3s ease;
    }

    .lbl {
        font-size: 0.55rem;
        color: var(--gray-40);
        margin-top: 4px;
        white-space: nowrap;
        height: 12px;
    }

    .col:hover .seg,
    .col:focus-visible .seg {
        filter: brightness(1.15);
    }

    .tooltip {
        position: fixed;
        z-index: 1000;
        min-width: 160px;
        max-width: 220px;
        padding: 8px 10px;
        background: var(--gray-90, #1a1a1a);
        border: 1px solid var(--gray-70, #333);
        border-radius: 6px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        font-size: 0.7rem;
        color: var(--gray-10);
    }

    .tip-date {
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--gray-20);
    }

    .tip-list {
        list-style: none;
        margin: 0 0 6px 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .tip-list li {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .time {
        color: var(--gray-30);
        font-variant-numeric: tabular-nums;
    }

    .tip-total {
        display: flex;
        justify-content: space-between;
        padding-top: 6px;
        border-top: 1px solid var(--gray-70, #333);
        font-weight: 600;
    }
</style>
