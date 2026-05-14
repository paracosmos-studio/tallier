<!--
    @component
    Dialog for editing an existing log's project, title, summary, date, times, and reason.

    @param {boolean} open - controls dialog visibility.
    @param {ReportEntry | null} entry - the log being edited.
    @param {Project[]} projects - all projects for the dropdown.
    @param {(data: { entryId: number; timerId: number; projectId: number; title: string | null; summary: string | null; date: string; start: string; end: string; reason: string | null }) => void} onsave - save callback.
    @param {() => void} onclose - close callback.
    @param {string} [notice] - optional info banner shown above the form (e.g. for view-only edits).
    @param {boolean} [showReason=true] - whether to show the "Reason for edit" input.
-->
<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Select from "$lib/components/select.svelte";
    import Button from "$lib/components/button.svelte";
    import { computeDuration, formatDuration, timeToSeconds } from "$lib/format";
    import type { ReportEntry, Project } from "$lib/types";

    type Props = {
        open: boolean;
        entry: ReportEntry | null;
        projects: Project[];
        onsave: (data: {
            entryId: number;
            timerId: number;
            projectId: number;
            title: string | null;
            summary: string | null;
            date: string;
            start: string;
            end: string;
            reason: string | null;
        }) => void;
        onclose: () => void;
        notice?: string;
        showReason?: boolean;
    };

    let { open, entry, projects, onsave, onclose, notice, showReason = true }: Props = $props();

    let editProjectId: string = $state("");
    let editTitle: string = $state("");
    let editSummary: string = $state("");
    let editDate: string = $state("");
    let editStart: string = $state("");
    let editEnd: string = $state("");
    let editReason: string = $state("");

    $effect(() => {
        if (open && entry) {
            editProjectId = String(entry.project_id);
            editTitle = entry.title ?? "";
            editSummary = entry.summary ?? "";

            // for cross-midnight split segments, edit against the source row
            editDate = entry.source_date ?? entry.date;
            editStart = toTimeInputValue(entry.source_start ?? entry.start);
            editEnd = toTimeInputValue(entry.source_end ?? entry.end ?? "");
            editReason = "";
        }
    });

    function toTimeInputValue(hhmmss: string): string {
        if (!hhmmss) return "00:00:00";
        const parts = hhmmss.split(":");
        return `${parts[0]}:${parts[1]}:${parts[2] ?? "00"}`;
    }

    function toHHMMSS(val: string): string {
        if (!val) return "00:00:00";
        const parts = val.split(":");
        return `${parts[0]}:${parts[1]}:${parts[2] ?? "00"}`;
    }

    let timeError: string | null = $derived.by(() => {
        const s = toHHMMSS(editStart);
        const e = toHHMMSS(editEnd);
        if (timeToSeconds(s) === timeToSeconds(e)) {
            return "Start and end cannot be the same.";
        }
        return null;
    });

    let crossesMidnight: boolean = $derived(
        !timeError && timeToSeconds(toHHMMSS(editEnd)) < timeToSeconds(toHHMMSS(editStart))
    );

    let durationLabel: string = $derived.by(() => {
        if (timeError) return "";
        return formatDuration(computeDuration(toHHMMSS(editStart), toHHMMSS(editEnd)));
    });

    function handleSave() {
        if (!entry || timeError || !editDate) return;
        onsave({
            entryId: entry.entry_id,
            timerId: entry.timer_id,
            projectId: parseInt(editProjectId),
            title: editTitle.trim() || null,
            summary: editSummary.trim() || null,
            date: editDate,
            start: toHHMMSS(editStart),
            end: toHHMMSS(editEnd),
            reason: editReason.trim() || null,
        });
    }

    let projectOptions: { value: string; label: string }[] = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );
</script>

<Dialog {open} title="Edit Log" {onclose}>
    {#if entry}
        <div class="form">
            {#if notice}
                <p class="notice">{notice}</p>
            {/if}
            <div class="field">
                <label for="edit-project">Project</label>
                <Select
                    options={projectOptions}
                    bind:value={editProjectId}
                    size="sm"
                    nullable={false}
                    searchable={false}
                />
            </div>
            <div class="field">
                <label for="edit-title">Title</label>
                <input
                    id="edit-title"
                    type="text"
                    bind:value={editTitle}
                    maxlength={100}
                    placeholder="Entry title"
                />
            </div>
            <div class="field">
                <label for="edit-summary">Summary</label>
                <textarea
                    id="edit-summary"
                    bind:value={editSummary}
                    maxlength={500}
                    rows={2}
                    placeholder="Summary notes"
                ></textarea>
            </div>
            <div class="field">
                <label for="edit-date">Start date</label>
                <input
                    id="edit-date"
                    type="date"
                    bind:value={editDate}
                />
            </div>
            <div class="times">
                <div class="field">
                    <label for="edit-start">Start</label>
                    <input
                        id="edit-start"
                        type="time"
                        step="1"
                        bind:value={editStart}
                    />
                </div>
                <div class="field">
                    <label for="edit-end">
                        End {#if crossesMidnight}<span class="next-day">next day</span>{/if}
                    </label>
                    <input
                        id="edit-end"
                        type="time"
                        step="1"
                        bind:value={editEnd}
                        class:invalid={timeError}
                    />
                </div>
            </div>
            {#if timeError}
                <p class="error">{timeError}</p>
            {:else if durationLabel}
                <p class="duration">Duration: {durationLabel}</p>
            {/if}
            {#if showReason}
                <div class="field">
                    <label for="edit-reason">Reason for edit</label>
                    <input
                        id="edit-reason"
                        type="text"
                        bind:value={editReason}
                        maxlength={200}
                        placeholder="Optional"
                    />
                </div>
            {/if}
        </div>
    {/if}
    {#snippet footer()}
        <Button size="xs" onclick={onclose} bgColor="var(--gray-60)" fgColor="var(--gray-10)">Cancel</Button>
        <Button size="xs" onclick={handleSave} bgColor="var(--green)" disabled={!!timeError}>Save</Button>
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
    }

    .field label {
        font-size: 0.65rem;
        color: var(--gray-40);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .field input,
    .field textarea {
        background: var(--gray-90);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        font-size: 0.8rem;
        padding: 6px 8px;
        font-family: inherit;
        resize: none;
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

    .times {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
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

    .notice {
        margin: 0 0 4px 0;
        padding: 8px 10px;
        background: color-mix(in srgb, var(--yellow) 10%, transparent);
        border-radius: 4px;
        color: var(--gray-10);
        font-size: 0.72rem;
        line-height: 1.4;
    }
</style>
