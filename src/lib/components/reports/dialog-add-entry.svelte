<!--
    @component
    Dialog for manually adding a log for any project on any day.

    @param {boolean} open - controls dialog visibility.
    @param {Project[]} projects - all projects for the dropdown.
    @param {(data: { projectId: number; date: string; start: string; end: string; title: string | null; summary: string | null }) => void} onsave - save callback.
    @param {() => void} onclose - close callback.
-->
<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Select from "$lib/components/select.svelte";
    import Button from "$lib/components/button.svelte";
    import { computeDuration, formatDateISO, formatDuration, timeToSeconds } from "$lib/format";
    import type { Project } from "$lib/types";

    type Props = {
        open: boolean;
        projects: Project[];
        onsave: (data: {
            projectId: number;
            date: string;
            start: string;
            end: string;
            title: string | null;
            summary: string | null;
        }) => void;
        onclose: () => void;
    };

    let { open, projects, onsave, onclose }: Props = $props();

    let projectId: string = $state("");
    let date: string = $state("");
    let title: string = $state("");
    let summary: string = $state("");
    let start: string = $state("");
    let end: string = $state("");

    $effect(() => {
        if (open) {
            projectId = projects[0] ? String(projects[0].id) : "";
            date = formatDateISO(new Date());
            title = "";
            summary = "";
            start = "09:00:00";
            end = "10:00:00";
        }
    });

    function toHHMMSS(val: string): string {
        if (!val) return "00:00:00";
        const parts = val.split(":");
        return `${parts[0]}:${parts[1]}:${parts[2] ?? "00"}`;
    }

    let timeError: string | null = $derived.by(() => {
        const s = toHHMMSS(start);
        const e = toHHMMSS(end);
        if (timeToSeconds(s) === timeToSeconds(e)) {
            return "Start and end cannot be the same.";
        }
        return null;
    });

    let crossesMidnight: boolean = $derived(
        !timeError && timeToSeconds(toHHMMSS(end)) < timeToSeconds(toHHMMSS(start))
    );

    let durationLabel: string = $derived.by(() => {
        if (timeError) return "";
        return formatDuration(computeDuration(toHHMMSS(start), toHHMMSS(end)));
    });

    let canSave: boolean = $derived(!!projectId && !!date && !timeError);

    function handleSave() {
        if (!canSave) return;
        onsave({
            projectId: parseInt(projectId),
            date,
            start: toHHMMSS(start),
            end: toHHMMSS(end),
            title: title.trim() || null,
            summary: summary.trim() || null,
        });
    }

    let projectOptions: { value: string; label: string }[] = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );
</script>

<Dialog {open} title="Add Log" width="520px" {onclose}>
    <div class="form">
        <div class="field">
            <label for="add-project">Project</label>
            <Select
                options={projectOptions}
                bind:value={projectId}
                size="md"
                nullable={false}
                searchable={false}
            />
        </div>
        <div class="row-3">
            <div class="field">
                <label for="add-date">Date</label>
                <input
                    id="add-date"
                    type="date"
                    bind:value={date}
                />
            </div>
            <div class="field">
                <label for="add-start">Start</label>
                <input
                    id="add-start"
                    type="time"
                    step="1"
                    bind:value={start}
                />
            </div>
            <div class="field">
                <label for="add-end">
                    End {#if crossesMidnight}<span class="next-day">next day</span>{/if}
                </label>
                <input
                    id="add-end"
                    type="time"
                    step="1"
                    bind:value={end}
                    class:invalid={timeError}
                />
            </div>
        </div>
        <div class="row-title-summary">
            <div class="field">
                <label for="add-title">Title</label>
                <input
                    id="add-title"
                    type="text"
                    bind:value={title}
                    maxlength={100}
                    placeholder="entry title"
                />
            </div>
            <div class="field">
                <label for="add-summary">Summary</label>
                <textarea
                    id="add-summary"
                    bind:value={summary}
                    maxlength={500}
                    rows={2}
                    placeholder="summary notes"
                ></textarea>
            </div>
        </div>
        {#if timeError}
            <p class="error">{timeError}</p>
        {:else if durationLabel}
            <p class="duration">Duration: {durationLabel}</p>
        {/if}
    </div>
    {#snippet footer()}
        <Button size="xs" onclick={onclose} bgColor="var(--gray-60)" fgColor="var(--gray-10)">Cancel</Button>
        <Button size="xs" onclick={handleSave} bgColor="var(--green)" disabled={!canSave}>Add</Button>
    {/snippet}
</Dialog>

<style>
    .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-bottom: 4px;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .field label {
        font-size: 0.65rem;
        color: var(--gray-40);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .field input,
    .field textarea {
        width: 100%;
        background: var(--gray-90);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        font-size: 0.8rem;
        padding: 6px 8px;
        font-family: inherit;
        resize: none;
        box-sizing: border-box;
    }

    .field input[type="time"],
    .field input[type="date"] {
        color-scheme: dark;
    }

    .field input:focus,
    .field textarea:focus {
        outline: none;
        border-color: var(--gray-40);
    }

    .row-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
    }

    .row-title-summary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: 8px;
        align-items: start;
    }

    .field input.invalid {
        border-color: var(--red);
    }

    .error {
        margin: 0;
        font-size: 0.7rem;
        color: var(--red);
    }

    .duration {
        margin: 0;
        font-size: 0.7rem;
        color: var(--gray-30);
        font-variant-numeric: tabular-nums;
    }

    .next-day {
        margin-left: 4px;
        padding: 1px 5px;
        background: color-mix(in srgb, var(--yellow) 18%, transparent);
        color: var(--gray-10);
        border-radius: 3px;
        font-size: 0.6rem;
        letter-spacing: 0.02em;
        text-transform: none;
    }
</style>
