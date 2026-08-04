<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Horizontal step-flow indicator: numbered markers, each with a title, joined by
    dashed connectors (e.g. "1 Title --- 2 Title"). The active step is highlighted.
    When `onselect` is provided, each step becomes a button for navigation;
    `isDisabled` can gate individual steps (the button is then non-interactive).

    @param {Array<{ label: string; title: string }>} steps - Ordered steps; `label`
        fills the circle, `title` sits beside it. The array length sets the count.
    @param {number} [current=0] - Zero-based index of the active step.
    @param {(index: number) => void} [onselect] - Fires with the clicked step index.
    @param {(index: number) => boolean} [isDisabled] - Returns true to block navigation to a step.
    @param {(index: number) => boolean} [isComplete] - Returns true to mark a step complete
        (its marker shows a check instead of the label).
-->

<script lang="ts">
    import StepMarker from './step-marker.svelte';

    type Step = {
        label: string;
        title: string;
    };

    type Props = {
        steps: Step[];
        current?: number;
        onselect?: (index: number) => void;
        isDisabled?: (index: number) => boolean;
        isComplete?: (index: number) => boolean;
    };

    let { steps, current = 0, onselect, isDisabled, isComplete }: Props = $props();
</script>

{#snippet head(step: Step, i: number)}
    <StepMarker label={step.label} current={i === current} complete={isComplete?.(i) ?? false} />
    <span class="step-title" class:current={i === current}>{step.title}</span>
{/snippet}

<ol class="stepper">
    {#each steps as step, i (i)}
        <li
            class="step"
            class:fill={i < steps.length - 1}
            aria-current={i === current ? 'step' : undefined}
        >
            {#if onselect}
                <button
                    type="button"
                    class="step-head interactive"
                    title={`Go to ${step.title}`}
                    disabled={isDisabled?.(i) ?? false}
                    onclick={() => onselect(i)}
                >
                    {@render head(step, i)}
                </button>
            {:else}
                <span class="step-head">{@render head(step, i)}</span>
            {/if}
            {#if i < steps.length - 1}
                <span class="connector" aria-hidden="true"></span>
            {/if}
        </li>
    {/each}
</ol>

<style>
    .stepper {
        display: flex;
        align-items: center;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .step {
        display: flex;
        align-items: center;
    }

    .step.fill {
        flex: 1;
    }

    .step-head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        margin: 0;
        padding: 0;
        background: none;
        border: none;
        font: inherit;
        color: inherit;
        text-align: left;
    }

    .step-head.interactive {
        cursor: pointer;
    }

    .step-head.interactive:not(:disabled):hover {
        opacity: 0.85;
    }

    .step-head.interactive:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }

    .step-title {
        font-size: 0.85rem;
        color: var(--gray-30);
    }

    .step-title.current {
        color: var(--gray-10);
        font-weight: 500;
    }

    .connector {
        flex: 1;
        margin: 0 12px;
        border-top: 2px dashed var(--gray-70);
    }
</style>
