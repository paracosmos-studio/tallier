<!--
    @component
    A single step marker rendered as a circle. Default state is a brand gray
    circle with light text; the current step uses a green fill with dark text;
    a complete step swaps the label for a check mark on the same green fill.

    @param {string} label - Text shown inside the circle (typically a step number).
    @param {boolean} [current=false] - Whether this marker is the active step.
    @param {boolean} [complete=false] - Whether this marker's step is complete.
-->

<script lang="ts">
    import Icon from './icon.svelte';
    import { CheckThicc } from '$lib/icons';

    type Props = {
        label: string;
        current?: boolean;
        complete?: boolean;
    };

    let { label, current = false, complete = false }: Props = $props();
</script>

<span class="marker" class:current class:complete>
    {#if complete}
        <Icon path={CheckThicc} size="16" fill="currentColor" />
    {:else}
        {label}
    {/if}
</span>

<style>
    .marker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--gray-70);
        color: var(--gray-10);
        font-size: 0.85rem;
        font-weight: 500;
    }

    .marker.current,
    .marker.complete {
        background: var(--green);
        color: var(--color-background);
    }
</style>
