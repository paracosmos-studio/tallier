<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Date range select paired with conditional custom-range date inputs. Used
    across the timesheet, reports, and invoice pages. Auto-seeds the custom
    range from the previously selected numeric range so the resolved range
    is never null.

    @param {string} [selectedRange="7"] - Bindable; one of the RANGE_OPTIONS values.
    @param {string} [customStart=""] - Bindable ISO date for custom range start.
    @param {string} [customEnd=""] - Bindable ISO date for custom range end.
    @param {(range: DateRange | null) => void} [onchange] - Fired after every change with the resolved range.
-->
<script lang="ts">
    import Select from "$lib/components/select.svelte";
    import { formatDateISO } from "$lib/helpers/format";
    import { RANGE_OPTIONS, computeDateRange, type DateRange } from "$lib/helpers/date-range";

    type Props = {
        selectedRange?: string;
        customStart?: string;
        customEnd?: string;
        onchange?: (range: DateRange | null) => void;
    };

    let {
        selectedRange = $bindable("7"),
        customStart = $bindable(""),
        customEnd = $bindable(""),
        onchange,
    }: Props = $props();

    // non-reactive: only read/written inside handleChange/ensureCustomDates
    let prevNumericRange: string = selectedRange !== "custom" ? selectedRange : "7";

    function ensureCustomDates(): void {
        if (selectedRange !== "custom") return;
        if (customStart && customEnd) return;
        const today = new Date();
        const parsed = parseInt(prevNumericRange);
        const days = Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
        const start = new Date(today);
        start.setDate(today.getDate() - days + 1);
        customStart = formatDateISO(start);
        customEnd = formatDateISO(today);
    }

    function handleChange(): void {
        if (selectedRange !== "custom") prevNumericRange = selectedRange;
        ensureCustomDates();
        onchange?.(computeDateRange(selectedRange, customStart, customEnd));
    }
</script>

{#if selectedRange === "custom"}
    <div class="custom-range">
        <input type="date" bind:value={customStart} onchange={handleChange} />
        <span class="range-sep">to</span>
        <input type="date" bind:value={customEnd} onchange={handleChange} />
    </div>
{/if}
<div class="range-select">
    <Select
        options={RANGE_OPTIONS}
        size="sm"
        nullable={false}
        searchable={false}
        bind:value={selectedRange}
        onchange={handleChange}
    />
</div>

<style>
    .range-select {
        width: 160px;
    }

    .custom-range {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .custom-range input {
        background: var(--gray-80);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        color-scheme: dark;
        font-size: 0.8rem;
        padding: 4px 6px;
        font-family: inherit;
    }

    .custom-range input:focus {
        outline: none;
        border-color: var(--gray-40);
    }

    .range-sep {
        font-size: 0.75rem;
        color: var(--gray-40);
    }
</style>
