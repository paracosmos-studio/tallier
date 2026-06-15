<!--
    @component
    Form for adding or editing a sender profile. Emails and phones are each
    label/value pairs the user can grow with an "add another" button or trim
    via the per-row remove button.

    @param {Profile} [profile] - Profile to edit. Omit for add mode.
    @param {boolean} [hideTitle=false] - Hide the form's own heading (e.g. when the host dialog provides one).
    @param {(payload: Omit<Profile, "id" | "position">) => void} onsave - Callback on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<script lang="ts">
    import { untrack } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add, Delete } from "$lib/icons";
    import type { Profile, ClientContact } from "$lib/types";
    import Button from "$lib/components/button.svelte";
    import AvatarUpload from "$lib/components/avatar-upload.svelte";

    type Props = {
        profile?: Profile;
        hideTitle?: boolean;
        onsave: (payload: Omit<Profile, "id" | "position">) => void;
        oncancel: () => void;
    };

    let { profile, hideTitle = false, onsave, oncancel }: Props = $props();

    let isEdit: boolean = $derived(!!profile);

    function seedList(list: ClientContact[] | null | undefined): ClientContact[] {
        if (list && list.length > 0) return list.map((c) => ({ ...c }));
        return [{ label: "", value: "" }];
    }

    let label: string = $state(untrack(() => profile?.label ?? ""));
    let businessName: string = $state(untrack(() => profile?.business_name ?? ""));
    let taxId: string = $state(untrack(() => profile?.tax_id ?? ""));
    let mailingAddress: string = $state(untrack(() => profile?.mailing_address ?? ""));
    let logo: string | null = $state(untrack(() => profile?.logo ?? null));
    let emails: ClientContact[] = $state(untrack(() => seedList(profile?.emails)));
    let phones: ClientContact[] = $state(untrack(() => seedList(profile?.phones)));

    // bound to the logo picker; commit() on save keeps the uploaded file
    let uploader: { commit: () => void } | undefined = $state(undefined);

    function addRow(list: ClientContact[]): ClientContact[] {
        return [...list, { label: "", value: "" }];
    }

    function removeRow(list: ClientContact[], idx: number): ClientContact[] {
        if (list.length <= 1) return [{ label: "", value: "" }];
        return list.filter((_, i) => i !== idx);
    }

    // strip rows whose label and value are both blank
    function compact(list: ClientContact[]): ClientContact[] | null {
        const out = list
            .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
            .filter((c) => c.label || c.value);
        return out.length > 0 ? out : null;
    }

    function handleSubmit(e: SubmitEvent): void {
        e.preventDefault();
        const name = label.trim();
        const business = businessName.trim();
        if (!name || !business) return;
        uploader?.commit(); // the stored logo is now referenced by a saved profile
        onsave({
            label: name,
            business_name: business,
            tax_id: taxId.trim() || null,
            logo,
            emails: compact(emails),
            phones: compact(phones),
            mailing_address: mailingAddress.trim() || null,
        });
    }
</script>

<section>
    {#if !hideTitle}
        <p class="title">{isEdit ? "Edit" : "New"} Profile</p>
    {/if}
    <form id="profile-form" onsubmit={handleSubmit}>
        <div class="identity-row">
            <AvatarUpload bind:value={logo} bind:this={uploader} />

            <div class="fields-col">
                <label>
                    <span class="lbl">Profile Label *</span>
                    <input
                        type="text"
                        maxlength="40"
                        bind:value={label}
                        onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") oncancel(); }}
                    />
                </label>

                <label>
                    <span class="lbl">Business / Legal Name *</span>
                    <input type="text" maxlength="60" bind:value={businessName} />
                </label>
            </div>
        </div>

        <label>
            <span class="lbl">Mailing Address</span>
            <textarea
                rows="3"
                maxlength="200"
                bind:value={mailingAddress}
            ></textarea>
        </label>

        {#snippet contactList(
            title: string,
            list: ClientContact[],
            labelPh: string,
            valuePh: string,
            valueType: string,
            setter: (next: ClientContact[]) => void,
        )}
            <div class="contact-group" role="group" aria-label={title}>
                <div class="contact-head">
                    <span class="lbl">{title}</span>
                </div>
                {#each list as item, idx (idx)}
                    <div class="pair">
                        <input
                            type="text"
                            class="pair-label"
                            placeholder={labelPh}
                            maxlength="40"
                            bind:value={list[idx].label}
                        />
                        <input
                            type={valueType}
                            class="pair-value"
                            placeholder={valuePh}
                            maxlength="200"
                            bind:value={list[idx].value}
                        />

                        <Button
                            type='button'
                            size='xs'
                            title='Remove'
                            bgColor='var(--background)'
                            fgColor='var(--gray-10)'
                            onclick={() => setter(removeRow(list, idx))}
                        >
                            <Icon path={Delete} size="14" fill="var(--red)" />
                        </Button>
                    </div>
                {/each}

                <div class="add-another">
                    <Button
                        type='button'
                        size='xs'
                        title='Add another'
                        bgColor='var(--gray-90)'
                        fgColor='var(--gray-20)'
                        onclick={() => setter(addRow(list))}
                    >
                        <Icon path={Add} size="12" fill="currentColor" />
                        <span>Add Another</span>
                    </Button>
                </div>
            </div>
        {/snippet}

        {@render contactList(
            "Emails",
            emails,
            "label",
            "name@example.com",
            "email",
            (next) => (emails = next),
        )}
        {@render contactList(
            "Phones",
            phones,
            "label",
            "+1 555 555 5555",
            "tel",
            (next) => (phones = next),
        )}

        <label>
            <span class="lbl">Tax ID / VAT / EIN</span>
            <input
                type="text"
                placeholder="e.g. EIN 12-3456789"
                maxlength="40"
                bind:value={taxId}
            />
        </label>
    </form>
</section>

<style>
    p.title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--yellow);
        margin: 0 0 0.75rem 0;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .identity-row {
        display: flex;
        gap: 1.25rem;
    }

    .fields-col {
        flex: 3.7;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .lbl {
        font-size: 0.75rem;
        color: var(--gray-30);
    }

    .contact-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-bottom: 10px;
    }

    .contact-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    input {
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

    input::placeholder {
        color: var(--gray-40);
    }

    input:focus {
        border-color: var(--gray-60);
    }

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
        resize: vertical;
        min-height: 80px;
    }

    textarea::placeholder {
        color: var(--gray-40);
    }

    textarea:focus {
        border-color: var(--gray-60);
    }

    .pair {
        display: flex;
        align-items: stretch;
        gap: 0.4rem;
    }

    .pair-label {
        width: 35%;
    }

    .pair-value {
        flex: 1;
    }
</style>
