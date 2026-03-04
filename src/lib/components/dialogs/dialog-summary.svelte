<!--
    @component
    Dialog for entering a title and summary after stopping a timer.

    @param {boolean} open - Controls dialog visibility.
    @param {(title: string, summary: string) => void} onsave - Callback with title and summary.
    @param {() => void} onskip - Callback when skipped.
-->

<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Button from "$lib/components/button.svelte";

    type Props = {
        open: boolean;
        onsave: (title: string, summary: string) => void;
        onskip: () => void;
    };

    let { open, onsave, onskip }: Props = $props();

    let title: string = $state("");
    let summary: string = $state("");

    function handleSave() {
        onsave(title.trim(), summary.trim());
        reset();
    }

    function handleSkip() {
        onskip();
        reset();
    }

    function reset() {
        title = "";
        summary = "";
    }
</script>

<Dialog {open} title="Entry Summary" dismissible={false} onclose={handleSkip}>
    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <input
            id="entry-title"
            type="text"
            placeholder="what did you work on?"
            maxlength="100"
            bind:value={title}
        />
        <textarea
            id="entry-summary"
            placeholder="additional notes"
            maxlength="500"
            rows="3"
            bind:value={summary}
        ></textarea>
    </form>

    {#snippet footer()}
        <Button
            size="xs"
            bgColor="var(--gray-60)"
            fgColor="var(--gray-10)"
            onclick={handleSkip}
        >
            Skip
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
        margin-top: 0.5rem;
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
        background: var(--gray-90);
        border: 1px solid var(--gray-60);
        padding: 8px;
        color: var(--gray-10);
        font-family: 'Instrument Sans', sans-serif;
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
</style>
