<!--
    @component
    Dialog wrapping the shared client form for invoice creation. It edits the
    given client inline and shows an "Update original client" toggle: when on,
    Save persists the edits to the stored client; when off, they apply to the
    current invoice only. Composes the base dialog; Save dispatches the wrapped
    form's submit.

    @param {boolean} open - Controls dialog visibility.
    @param {Client} [client] - Client to edit.
    @param {(payload: Omit<Client, "id" | "position">, updateOriginal: boolean) => void} onsave - Fired on Save.
    @param {() => void} onclose - Callback when the dialog is closed.
-->
<script lang="ts">
    import Dialog from "./dialog.svelte";
    import ClientForm from "$lib/components/client/client-form.svelte";
    import ToggleRow from "$lib/components/toggle-row.svelte";
    import Button from "$lib/components/button.svelte";
    import type { Client } from "$lib/types";

    type Props = {
        open: boolean;
        client?: Client;
        onsave: (payload: Omit<Client, "id" | "position">, updateOriginal: boolean) => void;
        onclose: () => void;
    };

    let { open, client, onsave, onclose }: Props = $props();

    let updateOriginal: boolean = $state(false);

    // reset the toggle each time the dialog opens
    $effect(() => {
        if (open) updateOriginal = false;
    });

    function handleSave(payload: Omit<Client, "id" | "position">): void {
        onsave(payload, updateOriginal);
    }

    function submit(): void {
        document
            .getElementById("client-form")
            ?.dispatchEvent(new Event("submit", { cancelable: true }));
    }
</script>

<Dialog {open} title="Edit Client" width="520px" {onclose}>
    <!-- mounted only while open so cancelling destroys the form and its avatar
         picker, triggering uncommitted-upload cleanup and a fresh reseed -->
    {#if open}
        <ClientForm {client} hideTitle onsave={handleSave} oncancel={onclose} />
        <div class="update-row">
            <ToggleRow
                label="Update original client"
                description="Save these changes to the stored client, not just this invoice."
                bind:checked={updateOriginal}
            />
        </div>
    {/if}
    {#snippet footer()}
        <Button size="sm" bgColor="var(--gray-60)" fgColor="var(--gray-10)" onclick={onclose}>
            Cancel
        </Button>
        <Button size="sm" bgColor="var(--green)" fgColor="var(--gray-90)" onclick={submit}>
            Save
        </Button>
    {/snippet}
</Dialog>

<style>
    .update-row {
        margin-top: 4px;
        padding-top: 12px;
        border-top: 1px solid var(--gray-70);
    }
</style>
