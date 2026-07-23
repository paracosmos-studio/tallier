<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Dialog for auto-generating invoice items from tracked time. Lets the user
    pick one or more projects (searchable), a custom start/end date range, and
    shaping options (cumulative-only, titles, summaries, rounding), then trigger
    generation. Composes the base `dialog.svelte`.

    @param {boolean} open - Controls dialog visibility.
    @param {Project[]} projects - Projects offered in the picker.
    @param {(data: GenerateOptions) => void} [ongenerate] - Fired when Generate is clicked.
    @param {() => void} onclose - Callback when the dialog is closed.
-->

<script lang="ts" module>
    export type GenerateOptions = {
        projectIds: number[];
        start: string;
        end: string;
        cumulativeOnly: boolean;
        includeTitles: boolean;
        includeSummaries: boolean;
        roundTo: string;
    };
</script>

<script lang="ts">
    import Dialog from "./dialog.svelte";
    import Select from "$lib/components/select.svelte";
    import Button from "$lib/components/button.svelte";
    import Toggle from "$lib/components/toggle.svelte";
    import SegmentedControl from "$lib/components/segmented-control.svelte";
    import { computeDateRange } from "$lib/helpers/date-range";
    import type { Project } from "$lib/types";

    type Props = {
        open: boolean;
        projects: Project[];
        ongenerate?: (data: GenerateOptions) => void;
        onclose: () => void;
    };

    let { open, projects, ongenerate, onclose }: Props = $props();

    let selectedProjects: string[] = $state([]);
    let start: string = $state("");
    let end: string = $state("");
    let cumulativeOnly: boolean = $state(false);
    let includeTitles: boolean = $state(true);
    let includeSummaries: boolean = $state(false);
    let roundTo: string = $state("1");

    const roundOptions = [
        { value: "1", label: "1 min" },
        { value: "5", label: "5 min" },
        { value: "15", label: "15 min" },
    ];

    let projectOptions: { value: string; label: string }[] = $derived(
        projects.map((p) => ({ value: String(p.id), label: p.name })),
    );

    // seed the range to the last 30 days each time the dialog opens
    $effect(() => {
        if (!open) return;
        const range = computeDateRange("30", "", "");
        if (range) {
            start = range.start;
            end = range.end;
        }
    });

    // native date pickers dismiss on selection; blur guarantees they close
    function commitDate(e: Event): void {
        (e.currentTarget as HTMLInputElement).blur();
    }

    function handleGenerate(): void {
        ongenerate?.({
            projectIds: selectedProjects.map((v) => parseInt(v)),
            start,
            end,
            cumulativeOnly,
            includeTitles,
            includeSummaries,
            roundTo,
        });
    }
</script>

<Dialog {open} title="Generate Invoice Items" width="420px" {onclose}>
    <div class="form">
        <div class="field">
            <span class="field-label">Projects</span>
            <Select
                options={projectOptions}
                size="sm"
                multiple
                nullable
                placeholder="All projects"
                multipleLabel={(n) => `${n} projects`}
                values={selectedProjects}
                onchangemultiple={(v) => (selectedProjects = v)}
            />
        </div>
        <div class="field">
            <span class="field-label">Date range</span>
            <div class="range">
                <input type="date" bind:value={start} onchange={commitDate} />
                <span class="sep">to</span>
                <input type="date" bind:value={end} onchange={commitDate} />
            </div>
        </div>

        <div class="options">
            <div class="opt-row">
                <span class="opt-label">Only show cumulative project hours per day</span>
                <Toggle bind:checked={cumulativeOnly} />
            </div>
            <div class="opt-row">
                <span class="opt-label" class:disabled={cumulativeOnly}>Include titles</span>
                <Toggle bind:checked={includeTitles} disabled={cumulativeOnly} />
            </div>
            <div class="opt-row">
                <span class="opt-label" class:disabled={cumulativeOnly}>Include summaries</span>
                <Toggle bind:checked={includeSummaries} disabled={cumulativeOnly} />
            </div>
            <div class="opt-row">
                <span class="opt-label">Round to</span>
                <SegmentedControl options={roundOptions} size="sm" bind:value={roundTo} />
            </div>
        </div>
    </div>
    {#snippet footer()}
        <Button
            size="sm"
            bgColor="var(--green)"
            fgColor="var(--gray-90)"
            disabled={!start || !end}
            onclick={handleGenerate}
        >
            Generate
        </Button>
    {/snippet}
</Dialog>

<style>
    .form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-bottom: 4px;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .field-label {
        font-size: 0.65rem;
        color: var(--gray-40);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .range {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .range input {
        flex: 1;
        min-width: 0;
        background: var(--field-bg);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        color-scheme: dark;
        font-size: 0.8rem;
        padding: 6px 8px;
        box-sizing: border-box;
    }

    .range input:focus {
        outline: none;
        border-color: var(--gray-40);
    }

    .sep {
        font-size: 0.75rem;
        color: var(--gray-40);
    }

    .options {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid var(--gray-70);
        padding-top: 12px;
    }

    .opt-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .opt-label {
        font-size: 0.8rem;
        color: var(--gray-10);
    }

    .opt-label.disabled {
        color: var(--gray-40);
    }
</style>
