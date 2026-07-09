<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    "Details" step of invoice creation: choose an inline-editable sender profile,
    then set the invoice number, issue/due dates and notes. The invoice number is
    seeded from the recipient client's invoice prefix when present, otherwise
    randomly generated; issue date defaults to today and due date to a week out.

    @param {Client} [client] - The invoice recipient (seeds the invoice number).
    @param {InvoiceMeta} [meta] - Persisted field values to restore across remounts.
    @param {Profile} [profile] - Persisted sender profile to restore across remounts.
    @param {(valid: boolean) => void} [onvalidchange] - Fires when required-field completeness changes.
    @param {(meta: InvoiceMeta) => void} [onchange] - Fires when the invoice number, dates or notes change.
    @param {(profile: Profile | undefined) => void} [onprofilechange] - Fires when the selected sender profile changes.
-->
<script lang="ts">
    import { onMount, untrack } from "svelte";
    import ProfileSelect from "./profile-select.svelte";
    import DialogEditProfile from "$lib/components/dialogs/dialog-edit-profile.svelte";
    import { getProfiles, createProfile, updateProfile } from "$lib/db";
    import { generateInvoiceNo } from "$lib/helpers/invoice";
    import { formatDateISO } from "$lib/helpers/format";
    import type { Client, InvoiceMeta, Profile } from "$lib/types";

    type Props = {
        client?: Client;
        meta?: InvoiceMeta | null;
        profile?: Profile;
        onvalidchange?: (valid: boolean) => void;
        onchange?: (meta: InvoiceMeta) => void;
        onprofilechange?: (profile: Profile | undefined) => void;
    };

    let { client, meta: initialMeta, profile: initialProfile, onvalidchange, onchange, onprofilechange }: Props =
        $props();

    function isoInDays(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return formatDateISO(d);
    }

    let profiles: Profile[] = $state([]);
    let selectedProfile: Profile | undefined = $state(
        untrack(() => (initialProfile ? { ...initialProfile } : undefined)),
    );
    let editOpen: boolean = $state(false);

    let invoiceNo: string = $state(untrack(() => initialMeta?.invoiceNo ?? generateInvoiceNo(client)));
    let issueDate: string = $state(untrack(() => initialMeta?.issueDate ?? isoInDays(0)));
    let dueDate: string = $state(untrack(() => initialMeta?.dueDate ?? ""));
    let notes: string = $state(untrack(() => initialMeta?.notes ?? ""));

    // From (profile) and Invoice No are required to advance to the next step
    let valid: boolean = $derived(selectedProfile != null && invoiceNo.trim() !== "");
    let meta: InvoiceMeta = $derived({ invoiceNo, issueDate, dueDate, notes });

    $effect(() => {
        onvalidchange?.(valid);
    });

    $effect(() => {
        onchange?.(meta);
    });

    $effect(() => {
        onprofilechange?.(selectedProfile);
    });

    onMount(async () => {
        profiles = await getProfiles();
        if (!selectedProfile && profiles.length > 0) selectedProfile = { ...profiles[0] };
    });

    // pick from the dropdown: copy so invoice-only edits never mutate the source
    function pickProfile(p: Profile): void {
        selectedProfile = { ...p };
    }

    async function handleEditSave(
        payload: Omit<Profile, "id" | "position">,
        updateOriginal: boolean,
    ): Promise<void> {
        // no current selection means the dialog ran in add mode: create + select
        if (!selectedProfile) {
            await createProfile(payload);
            profiles = await getProfiles();
            const created = profiles.at(-1);
            if (created) selectedProfile = { ...created };
            editOpen = false;
            return;
        }
        if (updateOriginal && selectedProfile.id != null) {
            await updateProfile(selectedProfile.id, payload);
            profiles = await getProfiles();
            selectedProfile =
                profiles.find((p) => p.id === selectedProfile!.id) ??
                { ...selectedProfile, ...payload };
        } else {
            selectedProfile = { ...selectedProfile, ...payload };
        }
        editOpen = false;
    }

    // native date pickers dismiss on selection; blur guarantees they close
    function commitDate(e: Event): void {
        (e.currentTarget as HTMLInputElement).blur();
    }
</script>

<div class="details">
    <div class="field" role="group" aria-label="From">
        <span class="lbl">From *</span>
        <ProfileSelect
            {profiles}
            selected={selectedProfile}
            onchange={pickProfile}
            onedit={() => (editOpen = true)}
            onadd={() => (editOpen = true)}
        />
    </div>

    <div class="grid">
        <label class="field">
            <span class="lbl">Invoice No *</span>
            <input type="text" maxlength="40" required bind:value={invoiceNo} />
        </label>
        <label class="field">
            <span class="lbl">Issue Date</span>
            <input type="date" bind:value={issueDate} onchange={commitDate} />
        </label>
        <label class="field">
            <span class="lbl">Due Date</span>
            <input type="date" bind:value={dueDate} onchange={commitDate} />
        </label>
    </div>

    <label class="field">
        <span class="lbl">Notes</span>
        <textarea rows="4" maxlength="500" bind:value={notes}></textarea>
    </label>
</div>

<!-- profile omitted while none is selected, putting the dialog in add mode -->
<DialogEditProfile
    open={editOpen}
    profile={selectedProfile}
    onsave={handleEditSave}
    onclose={() => (editOpen = false)}
/>

<style>
    .details {
        max-width: 90%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
    }

    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.75rem;
    }

    .lbl {
        font-size: 0.75rem;
        color: var(--gray-30);
    }

    input,
    textarea {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        box-sizing: border-box;
        color: var(--gray-10);
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 300;
        outline: none;
    }

    input[type="date"] {
        color-scheme: dark;
    }

    input:focus,
    textarea:focus {
        border-color: var(--gray-60);
    }

    textarea {
        resize: vertical;
        min-height: 80px;
    }
</style>
