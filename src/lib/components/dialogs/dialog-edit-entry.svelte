<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Dialog for editing an existing log's project, title, summary, date, times, and reason.
    Supports stepping through a related group of entries (`siblings`) so a single
    open dialog can edit any entry in a multi-entry cell.

    @param {boolean} open - controls dialog visibility.
    @param {ReportEntry | null} entry - the log being edited.
    @param {Project[]} projects - all projects for the dropdown.
    @param {(data: { entryId: number; timerId: number; projectId: number; title: string | null; summary: string | null; date: string; start: string; end: string; reason: string | null; hidden?: boolean; isBillable?: boolean }) => void} onsave - save callback; `hidden` is only present when `showHide` is true, `isBillable` only when `showBillable` is true.
    @param {() => void} onclose - close callback.
    @param {string} [notice] - optional info banner shown above the form (e.g. for view-only edits).
    @param {boolean} [showReason=true] - whether to show the "Reason for edit" input.
    @param {boolean} [showHide=false] - whether to show the "Hide entry" toggle (timesheet view-only).
    @param {boolean} [initialHidden=false] - current hidden state, used to seed the toggle when `showHide` is true.
    @param {boolean} [showBillable=false] - whether to show the "Mark as not billable" toggle (persisted edits).
    @param {boolean} [initialBillable=true] - current billable state, used to seed the toggle when `showBillable` is true.
    @param {ReportEntry[] | null} [siblings=null] - related entries reachable via prev/next pagination; when set and length > 1, navigation arrows appear at the top of the form. Unsaved changes are dropped on navigation.
    @param {(entry: ReportEntry) => void} [onnavigate] - called with the sibling to switch to.
-->
<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Select from "$lib/components/select.svelte";
    import ToggleRow from "$lib/components/toggle-row.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { ArrowBack, ArrowForward } from "$lib/icons";
    import { computeDuration, formatDuration, timeToSeconds } from "$lib/helpers/format";
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
            hidden?: boolean;
            isBillable?: boolean;
        }) => void;
        onclose: () => void;
        notice?: string;
        showReason?: boolean;
        showHide?: boolean;
        initialHidden?: boolean;
        showBillable?: boolean;
        initialBillable?: boolean;
        siblings?: ReportEntry[] | null;
        onnavigate?: (entry: ReportEntry) => void;
    };

    let {
        open,
        entry,
        projects,
        onsave,
        onclose,
        notice,
        showReason = true,
        showHide = false,
        initialHidden = false,
        showBillable = false,
        initialBillable = true,
        siblings = null,
        onnavigate,
    }: Props = $props();

    let pageCount: number = $derived(siblings?.length ?? 0);

    let pageIndex: number = $derived.by(() => {
        if (!siblings || !entry) return 0;
        const i = siblings.findIndex((s) => s.entry_id === entry.entry_id);
        return i < 0 ? 0 : i;
    });

    let showPager: boolean = $derived(pageCount > 1 && !!entry);

    function goPrev(): void {
        if (!siblings || !onnavigate || pageIndex <= 0) return;
        onnavigate(siblings[pageIndex - 1]);
    }

    function goNext(): void {
        if (!siblings || !onnavigate || pageIndex >= pageCount - 1) return;
        onnavigate(siblings[pageIndex + 1]);
    }

    // arrow-key pagination across siblings, skipped while focus is in a form
    // control so cursor movement in inputs is preserved
    function handleKeydown(e: KeyboardEvent): void {
        if (!open || !showPager) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
        e.preventDefault();
        if (e.key === "ArrowLeft") goPrev();
        else goNext();
    }

    let editProjectId: string = $state("");
    let editTitle: string = $state("");
    let editSummary: string = $state("");
    let editDate: string = $state("");
    let editStart: string = $state("");
    let editEnd: string = $state("");
    let editReason: string = $state("");
    let editHidden: boolean = $state(false);
    let editNotBillable: boolean = $state(false);

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

    // always mirror the upstream hidden state so the toggle stays in sync
    // when the entry changes or its hide state changes elsewhere. the dialog
    // mutates `editHidden` via the toggle binding (not `initialHidden`), so
    // this effect won't overwrite in-progress toggles before save.
    $effect(() => {
        editHidden = initialHidden;
    });

    // mirror upstream billable state the same way the hide toggle does
    $effect(() => {
        editNotBillable = !initialBillable;
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
            ...(showHide ? { hidden: editHidden } : {}),
            ...(showBillable ? { isBillable: !editNotBillable } : {}),
        });
    }

    let projectOptions: { value: string; label: string }[] = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog {open} title="Edit Log" width="520px" {onclose}>
    {#snippet headerExtras()}
        {#if showPager}
            <div class="pager">
                <button
                    class="page-btn"
                    title="Previous entry"
                    disabled={pageIndex === 0}
                    onclick={goPrev}
                >
                    <Icon path={ArrowBack} size="14" fill="currentColor" />
                </button>
                <span class="page-counter">Entry {pageIndex + 1} of {pageCount}</span>
                <button
                    class="page-btn"
                    title="Next entry"
                    disabled={pageIndex >= pageCount - 1}
                    onclick={goNext}
                >
                    <Icon path={ArrowForward} size="14" fill="currentColor" />
                </button>
            </div>
        {/if}
    {/snippet}
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
                    size="md"
                    nullable={false}
                    searchable={false}
                />
            </div>
            <div class="row-3">
                <div class="field">
                    <label for="edit-date">Date</label>
                    <input
                        id="edit-date"
                        type="date"
                        bind:value={editDate}
                    />
                </div>
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
            <div class="row-title-summary">
                <div class="field">
                    <label for="edit-title">Title</label>
                    <input
                        id="edit-title"
                        type="text"
                        bind:value={editTitle}
                        maxlength={100}
                        placeholder="what you worked on"
                    />
                </div>
                <div class="field">
                    <label for="edit-summary">Summary</label>
                    <textarea
                        id="edit-summary"
                        bind:value={editSummary}
                        maxlength={500}
                        rows={2}
                        placeholder="additional details"
                    ></textarea>
                </div>
            </div>
            {#if timeError}
                <p class="error">{timeError}</p>
            {:else if durationLabel}
                <p class="duration">Duration: {durationLabel}</p>
            {/if}
            {#if showHide}
                <ToggleRow label="Hide entry from timesheet" bind:checked={editHidden} />
            {/if}
            {#if showBillable}
                <ToggleRow label="Mark as not billable" bind:checked={editNotBillable} />
            {/if}
            {#if showReason}
                <div class="field">
                    <label for="edit-reason">Reason for edit</label>
                    <input
                        id="edit-reason"
                        type="text"
                        bind:value={editReason}
                        maxlength={200}
                        placeholder="optional"
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
        background: var(--field-bg);
        border: 1px solid var(--gray-60);
        border-radius: 4px;
        color: var(--gray-10);
        font-size: 0.8rem;
        padding: 6px 8px;
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

    .pager {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 0 2px;
    }

    .page-btn {
        background: none;
        border: none;
        padding: 4px 0;
        cursor: pointer;
        color: var(--gray-10);
        border-radius: 3px;
        display: flex;
        transition: color 0.15s ease;
    }

    .page-btn:hover:not(:disabled) {
        color: var(--green);
    }

    .page-btn:disabled {
        color: var(--gray-50);
        cursor: not-allowed;
    }

    .page-counter {
        font-size: 0.7rem;
        color: var(--gray-30);
        margin: 0 6px;
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
