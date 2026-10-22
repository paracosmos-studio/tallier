<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Dialog for entering a title and summary for a timer.

    @param {boolean} open - Controls dialog visibility.
    @param {(title: string, summary: string, isBillable: boolean) => void} onsave - Callback with title, summary, and billable flag.
    @param {() => void} onskip - Callback when skipped.
    @param {(isBillable: boolean) => void} [onbillablechange] - Fires immediately when the billable toggle changes, so the flag persists even if the form is skipped.
    @param {boolean} [running=false] - Timer is still running: present-tense placeholder and a Cancel button instead of Skip.
    @param {Entry | null} [entry=null] - Existing entry whose title, summary and billable flag seed the form on open.
-->

<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Button from "$lib/components/button.svelte";
    import ToggleRow from "$lib/components/toggle-row.svelte";
    import type { Entry } from "$lib/types";

    type Props = {
        open: boolean;
        onsave: (title: string, summary: string, isBillable: boolean) => void;
        onskip: () => void;
        onbillablechange?: (isBillable: boolean) => void;
        running?: boolean;
        entry?: Entry | null;
    };

    let { open, onsave, onskip, onbillablechange, running = false, entry = null }: Props = $props();

    let title: string = $state("");
    let summary: string = $state("");
    let notBillable: boolean = $state(false);
    let error: string = $state("");

    $effect(() => {
        if (!open) return;
        title = entry?.title ?? "";
        summary = entry?.summary ?? "";
        notBillable = entry ? !entry.is_billable : false;
        error = "";
    });

    function handleSave() {
        if (!title.trim()) {
            error = "* Required field is empty";
            return;
        }
        onsave(title.trim(), summary.trim(), !notBillable);
        reset();
    }

    function handleSkip() {
        onskip();
        reset();
    }

    function reset() {
        title = "";
        summary = "";
        notBillable = false;
        error = "";
    }
</script>

<Dialog {open} title="Summary" dismissible={false} onclose={handleSkip}>
    {#snippet headerRight()}
        <ToggleRow
            label="Not billable"
            bind:checked={notBillable}
            onchange={(checked) => onbillablechange?.(!checked)}
        />
    {/snippet}
    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <input
            id="entry-title"
            class:missing={error !== ""}
            type="text"
            required={true}
            placeholder={running ? "what are you working on?" : "what did you work on?"}
            maxlength="100"
            bind:value={title}
            oninput={() => (error = "")}
        />
        <textarea
            id="entry-summary"
            placeholder="additional notes"
            maxlength="500"
            rows="3"
            bind:value={summary}
        ></textarea>

        {#if error}
            <p class="error"><small>{error}</small></p>
        {/if}
    </form>

    {#snippet footer()}
        <Button
            size="xs"
            bgColor="var(--gray-60)"
            fgColor="var(--gray-10)"
            onclick={handleSkip}
        >
            {running ? "Cancel" : "Skip"}
        </Button>
        <Button
            size="xs"
            onclick={handleSave}
        >
            Save
        </Button>
    {/snippet}
</Dialog>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: 0px;
        margin-top: 0;
    }

    input {
        border-radius: 6px 6px 0 0;
    }

    textarea {
        border-radius: 0 0 6px 6px;
        margin-top: -1px;
    }

    input,
    textarea {
        background: var(--field-bg);
        border: 1px solid var(--gray-60);
        padding: 8px;
        color: var(--gray-10);
        font-size: 13px;
        outline: none;
        resize: none;
        transition: border-color 0.2s ease;
    }

    input::placeholder,
    textarea::placeholder {
        color: var(--gray-30);
    }

    input:focus,
    textarea:focus {
        border-color: var(--gray-40);
        z-index: 9;
    }

    .error {
        color: var(--red);
        margin: 5px 0 0 0;
    }

    .missing {
        border-color: var(--red);
        z-index: 12;
    }
</style>
