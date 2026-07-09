<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Dialog wrapping the shared profile form for invoice creation. With a profile
    it edits inline and shows an "Update original profile" toggle: when on, Save
    persists the edits to the stored profile; when off, they apply to the current
    invoice only. With no profile it acts as an add form that always creates.
    Composes the base dialog; Save dispatches the wrapped form's submit.

    @param {boolean} open - Controls dialog visibility.
    @param {Profile} [profile] - Profile to edit; omit for add mode.
    @param {(payload: Omit<Profile, "id" | "position">, updateOriginal: boolean) => void} onsave - Fired on Save.
    @param {() => void} onclose - Callback when the dialog is closed.
-->
<script lang="ts">
    import Dialog from "./dialog.svelte";
    import ProfileForm from "$lib/components/profile/profile-form.svelte";
    import ToggleRow from "$lib/components/toggle-row.svelte";
    import Button from "$lib/components/button.svelte";
    import type { Profile } from "$lib/types";

    type Props = {
        open: boolean;
        profile?: Profile;
        onsave: (payload: Omit<Profile, "id" | "position">, updateOriginal: boolean) => void;
        onclose: () => void;
    };

    let { open, profile, onsave, onclose }: Props = $props();

    // no profile to edit means we are creating a new one
    let isAdd: boolean = $derived(profile == null);
    let updateOriginal: boolean = $state(false);

    // reset the toggle each time the dialog opens
    $effect(() => {
        if (open) updateOriginal = false;
    });

    function handleSave(payload: Omit<Profile, "id" | "position">): void {
        onsave(payload, updateOriginal);
    }

    function submit(): void {
        document
            .getElementById("profile-form")
            ?.dispatchEvent(new Event("submit", { cancelable: true }));
    }
</script>

<Dialog {open} title={isAdd ? "Add Profile" : "Edit Profile"} width="520px" {onclose}>
    <!-- mounted only while open so cancelling destroys the form and its avatar
         picker, triggering uncommitted-upload cleanup and a fresh reseed -->
    {#if open}
        <ProfileForm {profile} hideTitle onsave={handleSave} oncancel={onclose} />
        {#if !isAdd}
            <div class="update-row">
                <ToggleRow
                    label="Update original profile"
                    description="Save these changes to the stored profile, not just this invoice."
                    bind:checked={updateOriginal}
                />
            </div>
        {/if}
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
