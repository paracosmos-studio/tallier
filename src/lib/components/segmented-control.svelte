<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Animated segmented control. Renders a row of mutually-exclusive options inside
    a single rounded container, with an animated indicator sliding to the active
    option. Each option may render an icon, a text label, or both.

    @param {Array<{ value: string; label?: string; icon?: string; title?: string }>} options The selectable options.
    @param {string} value The currently selected option value (bindable).
    @param {'sm' | 'md'} [size="md"] Size of the control.
    @param {(value: string) => void} [onchange] Callback when selection changes.
-->

<script lang="ts">
    import Icon from './icon.svelte';

    type SegmentedOption = {
        value: string;
        label?: string;
        icon?: string;
        title?: string;
    };

    interface Props {
        options: SegmentedOption[];
        value: string;
        size?: 'sm' | 'md';
        onchange?: (value: string) => void;
    }

    let {
        options,
        value = $bindable(),
        size = 'md',
        onchange,
    }: Props = $props();

    const iconSizeMap = { sm: '14', md: '16' };

    const activeIndex: number = $derived(
        Math.max(0, options.findIndex(o => o.value === value))
    );

    function select(v: string) {
        if (v === value) return;
        value = v;
        onchange?.(v);
    }
</script>

<div
    class={`seg ${size}`}
    role="radiogroup"
    style="--seg-count: {options.length}; --seg-index: {activeIndex};"
>
    <span class="seg-slider" aria-hidden="true"></span>
    {#each options as opt (opt.value)}
        <button
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            class={`seg-btn ${size}`}
            class:active={opt.value === value}
            title={opt.title ?? opt.label ?? ''}
            onclick={() => select(opt.value)}
        >
            {#if opt.icon}
                <Icon path={opt.icon} size={iconSizeMap[size]} fill="currentColor" />
            {/if}
            {#if opt.label}
                <span>{opt.label}</span>
            {/if}
        </button>
    {/each}
</div>

<style>
    .seg {
        --seg-pad: 2px;
        position: relative;
        display: inline-grid;
        grid-template-columns: repeat(var(--seg-count), 1fr);
        align-items: stretch;
        background: var(--field-bg);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
        padding: var(--seg-pad);
        box-sizing: border-box;
    }

    .seg-slider {
        position: absolute;
        top: var(--seg-pad);
        bottom: var(--seg-pad);
        left: var(--seg-pad);
        width: calc((100% - var(--seg-pad) * 2) / var(--seg-count));
        transform: translateX(calc(var(--seg-index) * 100%));
        background: var(--gray-70);
        border-radius: 4px;
        transition: transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
        pointer-events: none;
        box-sizing: border-box;
    }

    .seg-btn {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        background: transparent;
        border: none;
        color: var(--gray-30);
        font-family: inherit;
        cursor: pointer;
        transition: color 0.2s ease;
        white-space: nowrap;
        text-align: center;
    }

    .seg-btn.sm {
        padding: 0.3rem 0.7rem;
        font-size: 0.75rem;
        min-height: 24px;
    }

    .seg-btn.md {
        padding: 0.4rem 0.9rem;
        font-size: 0.85rem;
        min-height: 28px;
    }

    .seg-btn:hover {
        color: var(--gray-10);
    }

    .seg-btn.active {
        color: var(--gray-10);
    }
</style>
