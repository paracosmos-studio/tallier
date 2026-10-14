<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Tooltip primitive. Renders fixed to the viewport and portaled under
    `document.body`, so clipped or contained ancestors cannot cut it off or
    offset it, and keeps itself inside the window: it flips to the other side
    of the anchor when there is no room and clamps to the viewport edges,
    clear of the title bar.

    @param {boolean} open - whether the tooltip is shown.
    @param {TooltipAnchor | null} anchor - viewport rect to attach to; a zero-size rect follows a point such as the cursor.
    @param {'top' | 'bottom'} [placement='top'] - preferred side of the anchor.
    @param {'center' | 'start'} [align='center'] - `center` centers on the anchor; `start` sits past its right edge and flips left when it would overflow.
    @param {number} [gap=8] - distance from the anchor in pixels.
    @param {'sm' | 'md'} [size='md'] - `sm` tightens the padding for one-line content.
    @param {Snippet} children - tooltip content.
-->
<script lang="ts">
    import type { Snippet } from "svelte";
    import type { TooltipAnchor } from "$lib/types";

    type Props = {
        open: boolean;
        anchor: TooltipAnchor | null;
        placement?: "top" | "bottom";
        align?: "center" | "start";
        gap?: number;
        size?: "sm" | "md";
        children: Snippet;
    };

    let {
        open,
        anchor,
        placement = "top",
        align = "center",
        gap = 8,
        size = "md",
        children,
    }: Props = $props();

    // viewport insets the tooltip never crosses; top clears the fixed title bar
    const INSET = { top: 32, right: 8, bottom: 8, left: 8 } as const;

    let width: number = $state(0);
    let height: number = $state(0);

    function clamp(value: number, lo: number, hi: number): number {
        return Math.min(Math.max(value, lo), Math.max(lo, hi));
    }

    let position: { x: number; y: number } | null = $derived.by(() => {
        if (!anchor || width === 0 || height === 0) return null;
        const vw: number = window.innerWidth;
        const vh: number = window.innerHeight;

        let x: number = align === "center"
            ? anchor.x + anchor.width / 2 - width / 2
            : anchor.x + anchor.width + gap;
        if (align === "start" && x + width > vw - INSET.right) {
            x = anchor.x - gap - width;
        }

        const above: number = anchor.y - gap - height;
        const below: number = anchor.y + anchor.height + gap;
        let y: number = placement === "top" ? above : below;
        if (placement === "top" && above < INSET.top) y = below;
        else if (placement === "bottom" && below + height > vh - INSET.bottom) y = above;

        return {
            x: clamp(x, INSET.left, vw - width - INSET.right),
            y: clamp(y, INSET.top, vh - height - INSET.bottom),
        };
    });

    /**
     * Moves the node under body so no ancestor clips, scrolls or offsets it.
     */
    function portal(node: HTMLElement): { destroy: () => void } {
        document.body.appendChild(node);
        return { destroy: () => node.remove() };
    }
</script>

{#if open && anchor}
    <div
        class="tooltip"
        class:ready={position !== null}
        class:sm={size === "sm"}
        role="tooltip"
        use:portal
        bind:clientWidth={width}
        bind:clientHeight={height}
        style:transform={position ? `translate(${position.x}px, ${position.y}px)` : ""}
    >
        {@render children()}
    </div>
{/if}

<style>
    .tooltip {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        max-width: 240px;
        padding: 8px 10px;
        background: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
        box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 6px 16px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        visibility: hidden;
        font-size: 0.7rem;
        color: var(--gray-10);
        box-sizing: border-box;
    }

    .tooltip.ready {
        visibility: visible;
    }

    .tooltip.sm {
        padding: 4px 6px;
    }
</style>
