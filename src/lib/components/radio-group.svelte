<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Radio button group: renders one Radio per option, laid out in a row or
    column. Pairs with `radio.svelte` for the atomic primitive.

    @param {Array<{ value: string; label: string; disabled?: boolean }>} options
    @param {string} value - currently selected value (bindable).
    @param {string} name - shared HTML name; required so the inputs group natively.
    @param {'row' | 'column'} [direction="row"]
    @param {'sm' | 'md'} [size="md"]
    @param {number} [gap=14] - gap in pixels between options.
    @param {(value: string) => void} [onchange]
-->
<script lang="ts">
    import Radio from './radio.svelte';

    type Option = { value: string; label: string; disabled?: boolean };

    type Props = {
        options: Option[];
        value: string;
        name: string;
        direction?: 'row' | 'column';
        size?: 'sm' | 'md';
        gap?: number;
        onchange?: (value: string) => void;
    };

    let {
        options,
        value = $bindable(),
        name,
        direction = 'row',
        size = 'md',
        gap = 14,
        onchange,
    }: Props = $props();
</script>

<div
    class={`radio-group ${direction}`}
    role="radiogroup"
    style:--rg-gap="{gap}px"
>
    {#each options as opt (opt.value)}
        <Radio
            {name}
            value={opt.value}
            bind:groupValue={value}
            label={opt.label}
            disabled={opt.disabled}
            {size}
            {onchange}
        />
    {/each}
</div>

<style>
    .radio-group {
        display: flex;
        gap: var(--rg-gap);
    }

    .radio-group.column {
        flex-direction: column;
    }

    .radio-group.row {
        flex-wrap: wrap;
    }
</style>
