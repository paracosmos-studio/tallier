<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    A labeled row pairing descriptive text with a Toggle, for dialog options.

    @param {string} label - primary label text.
    @param {boolean} [checked=false] - toggle state (bindable).
    @param {string} [description] - optional secondary line under the label.
    @param {boolean} [disabled=false] - dims and disables the toggle.
    @param {(checked: boolean) => void} [onchange] - fires when the toggle changes.
-->
<script lang="ts">
    import Toggle from "$lib/components/toggle.svelte";

    type Props = {
        label: string;
        checked?: boolean;
        description?: string;
        disabled?: boolean;
        onchange?: (checked: boolean) => void;
    };

    let { label, checked = $bindable(false), description, disabled = false, onchange }: Props = $props();
</script>

<div class="toggle-row">
    <div class="text">
        <span class="label">{label}</span>
        {#if description}<span class="description">{description}</span>{/if}
    </div>
    <Toggle bind:checked {disabled} {onchange} />
</div>

<style>
    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .label {
        font-size: 0.8rem;
        color: var(--gray-10);
    }

    .description {
        font-size: 0.7rem;
        color: var(--gray-30);
        line-height: 1.3;
    }
</style>
