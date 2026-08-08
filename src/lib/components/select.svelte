<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Custom select dropdown with search functionality.

    @param {Array<{value: string, label: string, hint?: string}>} options The selectable options. Optional `hint` renders as muted yellow accent text alongside the label.
    @param {string} [value] The currently selected value (bindable, single-select).
    @param {string[]} [values] The currently selected values (bindable, multi-select).
    @param {boolean} [multiple=false] Enable multi-selection mode.
    @param {string} [placeholder="Select an option"] Placeholder text when no option is selected.
    @param {boolean} [nullable=false] Allow clearing selection to null/empty value (single-select only).
    @param {boolean} [searchable=true] Enable search functionality within the dropdown.
    @param {boolean} [disabled=false] Disable the select component, preventing interaction.
    @param {'sm' | 'md' | 'lg'} [size="md"] Size of the select component.
    @param {(count: number) => string} [multipleLabel] Trigger label formatter when 2+ options selected (multi mode).
    @param {() => void} [onopen] Callback when dropdown opens.
    @param {() => void} [onclose] Callback when dropdown closes.
    @param {(value: string) => void} [onchange] Callback when selection changes (single-select).
    @param {(values: string[]) => void} [onchangemultiple] Callback when selection changes (multi-select).
-->

<script lang="ts">
    import Icon from './icon.svelte';
    import { ArrowDropdown, Search, Close, Check } from '$lib/icons';

    interface Props {
        options: Array<{ value: string; label: string; hint?: string }>;
        value?: string;
        values?: string[];
        multiple?: boolean;
        placeholder?: string;
        nullable?: boolean;
        searchable?: boolean;
        disabled?: boolean;
        size?: 'sm' | 'md' | 'lg';
        multipleLabel?: (count: number) => string;
        onopen?: () => void;
        onclose?: () => void;
        onchange?: (value: string) => void;
        onchangemultiple?: (values: string[]) => void;
    }

    let {
        options = [],
        value = $bindable(''),
        values = $bindable([]),
        multiple = false,
        placeholder = 'Select an option',
        nullable = false,
        searchable = true,
        disabled = false,
        size = 'md',
        multipleLabel = (n: number) => `${n} selected`,
        onopen,
        onclose,
        onchange,
        onchangemultiple,
    }: Props = $props();

    let isOpen: boolean = $state(false);
    let searchQuery: string = $state('');
    let searchInputRef: HTMLInputElement | undefined = $state();
    const iconSizeMap = {
        close: { sm: "11", md: "13", lg: "16" },
        dropdown: { sm: "16", md: "20", lg: "20" },
        search: { sm: "15", md: "15", lg: "18" },
        check: { sm: "14", md: "16", lg: "18" }
    };

    const filteredOptions = $derived(
        options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const selectedLabel = $derived.by(() => {
        if (multiple) {
            if (values.length === 0) return placeholder;
            if (values.length === 1) {
                return options.find(o => o.value === values[0])?.label ?? placeholder;
            }
            return multipleLabel(values.length);
        }
        return options.find(opt => opt.value === value)?.label || placeholder;
    });

    const hasSelection = $derived(multiple ? values.length > 0 : !!value);
    const selectedHint = $derived(!multiple ? options.find(o => o.value === value)?.hint : undefined);

    function isSelected(optValue: string): boolean {
        return multiple ? values.includes(optValue) : optValue === value;
    }

    function toggleDropdown() {
        if (disabled) return;
        isOpen = !isOpen;
        if (isOpen) {
            onopen?.();
            searchQuery = '';
            setTimeout(() => searchInputRef?.focus(), 0);
        } else {
            onclose?.();
        }
    }

    function selectOption(optionValue: string) {
        if (multiple) {
            const next = values.includes(optionValue)
                ? values.filter(v => v !== optionValue)
                : [...values, optionValue];
            values = next;
            onchangemultiple?.(next);
            setTimeout(() => searchInputRef?.focus(), 0);
        } else {
            value = optionValue;
            isOpen = false;
            searchQuery = '';
            onchange?.(optionValue);
            onclose?.();
        }
    }

    function clearSelection(event: MouseEvent | KeyboardEvent) {
        event.stopPropagation();
        if (multiple) {
            values = [];
            onchangemultiple?.([]);
        } else {
            value = '';
            onchange?.('');
        }
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.select-container')) {
            isOpen = false;
            searchQuery = '';
            onclose?.();
        }
    }

    $effect(() => {
        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
        } else {
            document.removeEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

<div class="select-container">
    <button
        type="button"
        class={`select-trigger ${size}`}
        onclick={toggleDropdown}
        class:open={isOpen}
        class:disabled={disabled}
    >
        {#if !isOpen}
            <span class="selected-value">{selectedLabel}</span>
            {#if selectedHint}
                <span class={`option-hint ${size}`}>{selectedHint}</span>
            {/if}
            {#if nullable && hasSelection}
                <span
                    role="button"
                    tabindex="0"
                    class="clear-btn"
                    onclick={clearSelection}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && clearSelection(e)}
                    title="Clear selection"
                >
                    <Icon path={Close} size={iconSizeMap.close[size]} fill="currentColor" />
                </span>
            {/if}
            <Icon path={ArrowDropdown} size={iconSizeMap.dropdown[size]} fill="var(--gray-20)" />
        {:else}
            {#if searchable}
                <div class={`search-wrapper ${size}`}>
                    <Icon path={Search} size={iconSizeMap.search[size]} fill="var(--gray-30)" />
                    <input
                        bind:this={searchInputRef}
                        type="text"
                        class={`search-input ${size}`}
                        bind:value={searchQuery}
                        placeholder={searchQuery ? '' : placeholder}
                    />
                </div>
            {:else}
                <span class="selected-value">{selectedLabel}</span>
            {/if}
        {/if}
    </button>

    {#if isOpen}
        <ul class="dropdown-menu">
            {#if !multiple && nullable && !searchQuery}
                <li>
                    <button
                        type="button"
                        class={`option ${size}`}
                        class:selected={!value}
                        onclick={() => selectOption('')}
                    >
                        <span class="none-option">None</span>
                    </button>
                </li>
            {/if}
            {#each filteredOptions as option (option.value)}
                <li>
                    <button
                        type="button"
                        class={`option ${size}`}
                        class:selected={isSelected(option.value)}
                        onclick={() => selectOption(option.value)}
                    >
                        <span class="option-label">{option.label}</span>
                        {#if option.hint}
                            <span class={`option-hint ${size}`}>{option.hint}</span>
                        {/if}
                        {#if multiple && isSelected(option.value)}
                            <Icon path={Check} size={iconSizeMap.check[size]} fill="var(--green)" />
                        {/if}
                    </button>
                </li>
            {:else}
                <li class="no-results">No results</li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .select-container {
        position: relative;
        width: 100%;
        box-sizing: border-box;
    }

    .select-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--field-bg);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
        color: var(--color-text);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .select-trigger.sm {
        padding: 0.25rem 0.45rem;
        font-size: 0.875rem;
        gap: 2px;
    }

    .select-trigger.md {
        padding: 0.35rem 0.55rem;
        font-size: 0.95rem;
        gap: 4px;
    }

    .select-trigger.lg {
        padding: 0.65rem;
        font-size: 1rem;
        gap: 6px;
    }

    .select-trigger:hover {
        border-color: var(--gray-60);
        background: var(--gray-80);
    }

    .select-trigger.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
    }

    .select-trigger.open {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .selected-value {
        flex: 1;
        text-align: left;
        color: var(--color-text);
        pointer-events: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .search-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        pointer-events: none;
        box-sizing: border-box;
    }

    .search-wrapper.sm,
    .search-wrapper.md {
        gap: 0.4rem;
    }

    .search-wrapper.lg {
        gap: 0.5rem;
    }

    .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-text);
        padding: 0;
        pointer-events: auto;
    }

    .search-input.sm {
        font-size: 0.875rem;
    }

    .search-input.md {
        font-size: 0.95rem;
    }

    .search-input.lg {
        font-size: 1rem;
    }

    .search-input::placeholder {
        color: var(--gray-30);
    }

    .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        max-height: 150px;
        overflow-y: auto;
        background: var(--field-bg);
        border: 1px solid var(--gray-70);
        border-radius: 0 0 6px 6px;
        margin: 0;
        padding: 0px;
        list-style: none;
        z-index: 100;
        box-sizing: border-box;
    }

    .dropdown-menu li {
        margin: 0;
        padding: 0;
    }

    .dropdown-menu li.no-results {
        padding: 0.5rem;
        text-align: center;
        color: var(--gray-30);
        font-size: 1rem;
    }

    .option {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 0px;
        color: var(--gray-10);
        text-align: left;
        cursor: pointer;
        transition: all 0.1s ease;
        outline: none;
    }

    .option-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .option-hint {
        color: var(--yellow);
        flex-shrink: 0;
        pointer-events: none;
    }

    .option-hint.sm { font-size: 0.75rem; }
    .option-hint.md { font-size: 0.8rem; }
    .option-hint.lg { font-size: 0.85rem; }

    .option.sm {
        padding: 0.35rem 0.5rem;
        font-size: 0.875rem;
    }

    .option.md {
        padding: 0.45rem 0.6rem;
        font-size: 0.95rem;
    }

    .option.lg {
        padding: 0.5rem 0.65rem;
        font-size: 1rem;
    }

    .option:hover,
    .option:focus {
        background: var(--gray-70);
    }

    .option.selected {
        background: var(--gray-70);
        color: var(--gray-10);
    }

    .clear-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0rem;
        background: transparent;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.1s ease;
    }

    .clear-btn:hover {
        color: var(--red);
    }

    .none-option {
        color: var(--gray-30);
        font-style: italic;
    }

    .dropdown-menu::-webkit-scrollbar {
        width: 7px;
    }

    .dropdown-menu::-webkit-scrollbar-track {
        background: transparent;
    }

    .dropdown-menu::-webkit-scrollbar-thumb {
        background: var(--gray-50);
        border-radius: 4px;
    }

    .dropdown-menu::-webkit-scrollbar-thumb:hover {
        background: var(--gray-40);
    }
</style>
