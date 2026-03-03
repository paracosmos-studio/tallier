<!--
    @component
    Confirmation dialog built on the Dialog component.

    @param {boolean} open - Controls dialog visibility.
    @param {string} [title="Confirm"] - Header title text.
    @param {string} message - Confirmation message displayed in the body.
    @param {string} [confirmLabel="Confirm"] - Label for the confirm button.
    @param {string} [cancelLabel="Cancel"] - Label for the cancel button.
    @param {() => void} onconfirm - Callback when confirmed.
    @param {() => void} oncancel - Callback when cancelled or closed.
-->

<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import Button from "$lib/components/button.svelte";

    type Props = {
        open: boolean;
        title?: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onconfirm: () => void;
        oncancel: () => void;
    };

    let {
        open,
        title = "Confirm",
        message,
        confirmLabel = "Confirm",
        cancelLabel = "Cancel",
        onconfirm,
        oncancel,
    }: Props = $props();
</script>

<Dialog {open} {title} onclose={oncancel}>
    <p>{message}</p>

    {#snippet footer()}
        <Button
            size="xs"
            bgColor="var(--gray-60)"
            fgColor="var(--gray-10)"
            onclick={oncancel}
        >
            {cancelLabel}
        </Button>
        <Button
            size="xs"
            bgColor="var(--red)"
            fgColor="var(--gray-90)"
            onclick={onconfirm}
        >
            {confirmLabel}
        </Button>
    {/snippet}
</Dialog>

<style>
    p {
        margin: 0;
    }
</style>
