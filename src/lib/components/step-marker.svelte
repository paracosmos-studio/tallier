<!--
    @component
    A single step marker rendered as a circle. Default state is a brand gray
    circle with light text; the current step uses a green fill with dark text.

    @param {string} label - Text shown inside the circle (typically a step number).
    @param {boolean} [current=false] - Whether this marker is the active step.
-->

<script lang="ts">
    type Props = {
        label: string;
        current?: boolean;
    };

    let { label, current = false }: Props = $props();
</script>

<span class="marker" class:current>{label}</span>

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

    .marker.current {
        background: var(--green);
        color: var(--color-background);
    }
</style>
