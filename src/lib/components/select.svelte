<script lang="ts">
    import Icon from './icon.svelte';
    import { ArrowDropdown, Search, Close } from '$lib/icons';

    interface Props {
        options: Array<{ value: string; label: string }>;
        value?: string;
        placeholder?: string;
        nullable?: boolean;
        searchable?: boolean;
        size?: 'sm' | 'md' | 'lg';
        onopen?: () => void;
        onclose?: () => void;
        onchange?: (value: string) => void;
    }

    let {
        options = [],
        value = $bindable(''),
        placeholder = 'Select an option',
        nullable = false,
        searchable = true,
        size = 'md',
        onopen,
        onclose,
        onchange
    }: Props = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');
    let searchInputRef: HTMLInputElement | undefined = $state();
    let iconSizeMap = {
        close: { sm: "11", md: "13", lg: "16" },
        dropdown: { sm: "16", md: "20", lg: "20" },
        search: { sm: "15", md: "15", lg: "18" }
    };

    const filteredOptions = $derived(
        options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const selectedLabel = $derived(
        options.find(opt => opt.value === value)?.label || placeholder
    );

    function toggleDropdown() {
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
        value = optionValue;
        isOpen = false;
        searchQuery = '';
        onchange?.(optionValue);
    }

    function clearSelection(event: MouseEvent | KeyboardEvent) {
        event.stopPropagation();
        value = '';
        onchange?.('');
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

<!--
    @component
    Custom select dropdown with search functionality.

    @param {Array<{value: string, label: string}>} options The selectable options.
    @param {string} [value] The currently selected value (bindable).
    @param {string} [placeholder="Select an option"] Placeholder text when no option is selected.
    @param {boolean} [nullable=false] Allow clearing selection to null/empty value.
    @param {boolean} [searchable=true] Enable search functionality within the dropdown.
    @param {'sm' | 'md' | 'lg'} [size="md"] Size of the select component.
    @param {() => void} [onopen] Callback when dropdown opens.
    @param {() => void} [onclose] Callback when dropdown closes.
    @param {(value: string) => void} [onchange] Callback when selection changes.
-->
<div class="select-container">
    <button
        type="button"
        class={`select-trigger ${size}`}
        onclick={toggleDropdown}
        class:open={isOpen}
    >
        {#if !isOpen}
            <span class="selected-value">{selectedLabel}</span>
            {#if nullable && value}
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
            {#if nullable && !searchQuery}
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
                        class:selected={option.value === value}
                        onclick={() => selectOption(option.value)}
                    >
                        {option.label}
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
        background: var(--gray-90);
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

    .select-trigger.open {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .selected-value {
        flex: 1;
        text-align: left;
        color: var(--color-text);
        pointer-events: none;
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
        font-family: inherit;
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
        background: var(--gray-90);
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
        display: block;
        background: transparent;
        border: none;
        border-radius: 0px;
        color: var(--gray-10);
        font-family: inherit;
        text-align: left;
        cursor: pointer;
        transition: all 0.1s ease;
        outline: none;
    }

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
