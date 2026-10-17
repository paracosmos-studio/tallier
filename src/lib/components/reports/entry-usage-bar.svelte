<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Stacked horizontal bar of an entry's time per foreground app. Hovering a
    slice, or tabbing into the bar and moving with the arrow keys, shows a
    tooltip with the app icon, name and time.

    @param {StackedBarSegment[]} segments - slices in display order; keys are app ids.
    @param {Map<string, string>} icons - app id to png data uri for the tooltip.
    @param {(value: number) => string} [formatValue] - duration formatter.
-->
<script lang="ts">
    import Tooltip from "$lib/components/tooltip.svelte";
    import AppIcon from "$lib/components/app-icon.svelte";
    import { OTHER_KEY, UNTRACKED_KEY } from "$lib/helpers/app-usage";
    import type { StackedBarSegment, TooltipAnchor } from "$lib/types";

    type Props = {
        segments: StackedBarSegment[];
        icons: Map<string, string>;
        formatValue?: (value: number) => string;
    };

    let { segments, icons, formatValue = (v: number) => String(v) }: Props = $props();

    let active: number | null = $state(null);
    let anchor: TooltipAnchor | null = $state(null);
    let slices: HTMLButtonElement[] = $state([]);

    let activeSegment: StackedBarSegment | null = $derived(
        active === null ? null : segments[active] ?? null
    );

    let swatchOnly: boolean = $derived(
        activeSegment?.key === UNTRACKED_KEY || activeSegment?.key === OTHER_KEY
    );

    function activate(index: number | null): void {
        active = index;
        const el = index === null ? undefined : slices[index];
        if (!el) {
            anchor = null;
            return;
        }
        const r = el.getBoundingClientRect();
        anchor = { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    function handleMove(e: MouseEvent): void {
        const el = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
        const index: number | null = el ? Number(el.dataset.index) : null;
        if (index !== active) activate(index);
    }

    function handleFocusOut(e: FocusEvent): void {
        const next = e.relatedTarget as Node | null;
        if (!(e.currentTarget as HTMLElement).contains(next)) activate(null);
    }

    function handleKey(e: KeyboardEvent, index: number): void {
        const last: number = segments.length - 1;
        let next: number | null = index;
        switch (e.key) {
            case "ArrowRight":
                next = Math.min(last, index + 1);
                break;
            case "ArrowLeft":
                next = Math.max(0, index - 1);
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = last;
                break;
            case "Escape":
                next = null;
                break;
            default:
                return;
        }
        e.preventDefault();
        if (next === null) activate(null);
        else slices[next]?.focus();
    }
</script>

<svelte:window onscrollcapture={() => activate(null)} />

<div
    class="bar"
    role="group"
    aria-label="App usage"
    onmousemove={handleMove}
    onmouseleave={() => activate(null)}
    onfocusout={handleFocusOut}
>
    {#each segments as seg, i (seg.key)}
        <button
            type="button"
            class="slice"
            class:active={i === active}
            tabindex={i === 0 ? 0 : -1}
            data-index={i}
            aria-label="{seg.label}, {formatValue(seg.value)}"
            bind:this={slices[i]}
            style:flex-grow={seg.value}
            style:background-color={seg.color}
            onfocus={() => activate(i)}
            onkeydown={(e) => handleKey(e, i)}
        ></button>
    {/each}
</div>

<Tooltip open={activeSegment !== null} {anchor} placement="top" size="sm">
    {#if activeSegment}
        <span class="tip">
            {#if swatchOnly}
                <span class="swatch" style:background-color={activeSegment.color}></span>
            {:else}
                <AppIcon name={activeSegment.label} src={icons.get(String(activeSegment.key))} size={16} />
            {/if}
            <span class="tip-name">{activeSegment.label}</span>
            <span class="tip-time">{formatValue(activeSegment.value)}</span>
        </span>
    {/if}
</Tooltip>

<style>
    .bar {
        display: flex;
        gap: 1px;
        height: 6px;
        width: 100%;
    }

    .slice {
        flex: 0 1 0;
        min-width: 3px;
        padding: 0;
        border: none;
        border-radius: 1px;
        cursor: default;
        transition: filter 0.15s ease;
    }

    .slice:first-child {
        border-radius: 3px 1px 1px 3px;
    }

    .slice:last-child {
        border-radius: 1px 3px 3px 1px;
    }

    .slice.active {
        filter: brightness(1.2);
    }

    .slice:focus-visible {
        outline: 1px solid var(--gray-10);
        outline-offset: 2px;
    }

    .tip {
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
    }

    .swatch {
        width: 16px;
        height: 6px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .tip-name {
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tip-time {
        color: var(--gray-30);
        font-variant-numeric: tabular-nums;
    }
</style>
