<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Stacked horizontal bar of an entry's time per foreground app. Hovering a
    slice, or tabbing into the bar and moving with the arrow keys, shows a
    tooltip with the app icon, name and time. With `ondelete`, ranked app
    slices add a remove button at the end of the tooltip; the tooltip then
    accepts the pointer and Tab moves slice to remove to the next control.

    @param {StackedBarSegment[]} segments - slices in display order; keys are app ids.
    @param {Map<string, string>} icons - app id to png data uri for the tooltip.
    @param {(value: number) => string} [formatValue] - duration formatter.
    @param {(segment: StackedBarSegment) => void} [ondelete] - remove requested for an app slice.
-->
<script lang="ts">
    import Tooltip from "$lib/components/tooltip.svelte";
    import AppIcon from "$lib/components/app-icon.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Delete } from "$lib/icons";
    import { OTHER_KEY, UNTRACKED_KEY } from "$lib/helpers/app-usage";
    import type { StackedBarSegment, TooltipAnchor } from "$lib/types";

    type Props = {
        segments: StackedBarSegment[];
        icons: Map<string, string>;
        formatValue?: (value: number) => string;
        ondelete?: (segment: StackedBarSegment) => void;
    };

    let { segments, icons, formatValue = (v: number) => String(v), ondelete }: Props = $props();

    const HOVER_CLOSE_DELAY: number = 150;
    const FOCUSABLE: string =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let active: number | null = $state(null);
    let anchor: TooltipAnchor | null = $state(null);
    let slices: HTMLButtonElement[] = $state([]);
    let root: HTMLDivElement | null = $state(null);
    let deleteButton: HTMLButtonElement | null = $state(null);
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    let activeSegment: StackedBarSegment | null = $derived(
        active === null ? null : segments[active] ?? null
    );

    let swatchOnly: boolean = $derived(
        activeSegment?.key === UNTRACKED_KEY || activeSegment?.key === OTHER_KEY
    );

    let deletable: boolean = $derived(activeSegment !== null && !swatchOnly && ondelete !== undefined);

    function activate(index: number | null): void {
        clearTimeout(closeTimer);
        active = index;
        const el = index === null ? undefined : slices[index];
        if (!el) {
            anchor = null;
            return;
        }
        const r = el.getBoundingClientRect();
        anchor = { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    function scheduleHide(): void {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => activate(null), HOVER_CLOSE_DELAY);
    }

    function keepOpen(): void {
        clearTimeout(closeTimer);
    }

    function handleMove(e: MouseEvent): void {
        keepOpen();
        const el = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
        const index: number | null = el ? Number(el.dataset.index) : null;
        if (index !== active) activate(index);
    }

    function handleFocusOut(e: FocusEvent): void {
        const next = e.relatedTarget as Node | null;
        if ((e.currentTarget as HTMLElement).contains(next) || next === deleteButton) return;
        activate(null);
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
            case "Tab":
                if (e.shiftKey || !deleteButton) return;
                e.preventDefault();
                deleteButton.focus();
                return;
            default:
                return;
        }
        e.preventDefault();
        if (next === null) activate(null);
        else slices[next]?.focus();
    }

    // the tooltip is portaled, so tab order is bridged by hand:
    // slice -> remove -> first focusable after the bar
    function focusAfterBar(): void {
        if (!root) return;
        for (const el of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
            const after: boolean = (root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
            if (after && !root.contains(el) && el !== deleteButton) {
                el.focus();
                return;
            }
        }
    }

    function handleDeleteKey(e: KeyboardEvent): void {
        if (e.key !== "Escape" && e.key !== "Tab") return;
        e.preventDefault();
        if (e.key === "Tab" && !e.shiftKey) {
            activate(null);
            focusAfterBar();
            return;
        }
        const from: HTMLButtonElement | undefined = active === null ? undefined : slices[active];
        from?.focus();
        if (e.key === "Escape") activate(null);
    }

    function requestDelete(): void {
        if (!activeSegment || !ondelete) return;
        const segment: StackedBarSegment = activeSegment;
        activate(null);
        ondelete(segment);
    }
</script>

<svelte:window onscrollcapture={() => activate(null)} />

<div
    class="bar"
    role="group"
    aria-label="App usage"
    bind:this={root}
    onmousemove={handleMove}
    onmouseleave={scheduleHide}
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

<Tooltip
    open={activeSegment !== null}
    {anchor}
    placement="top"
    size="sm"
    interactive={deletable}
    onpointerenter={keepOpen}
    onpointerleave={scheduleHide}
>
    {#if activeSegment}
        <span class="tip">
            {#if swatchOnly}
                <span class="swatch" style:background-color={activeSegment.color}></span>
            {:else}
                <AppIcon name={activeSegment.label} src={icons.get(String(activeSegment.key))} size={16} />
            {/if}
            <span class="tip-name">{activeSegment.label}</span>
            <span class="tip-time">{formatValue(activeSegment.value)}</span>
            {#if deletable}
                <button
                    type="button"
                    class="tip-delete"
                    title="Remove {activeSegment.label} from this entry"
                    aria-label="Remove {activeSegment.label} from this entry"
                    bind:this={deleteButton}
                    onclick={requestDelete}
                    onfocus={keepOpen}
                    onblur={scheduleHide}
                    onkeydown={handleDeleteKey}
                >
                    <Icon path={Delete} size="12" fill="currentColor" />
                </button>
            {/if}
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

    .tip-delete {
        display: flex;
        margin-left: 2px;
        padding: 2px;
        border: none;
        border-radius: 3px;
        background: none;
        color: var(--red);
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.15s ease;
    }

    .tip-delete:hover {
        opacity: 1;
    }

    .tip-delete:focus-visible {
        opacity: 1;
        outline: 1px solid var(--gray-10);
        outline-offset: 1px;
    }
</style>
