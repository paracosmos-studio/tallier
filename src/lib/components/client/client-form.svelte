<!--
    @component
    Form for adding or editing a client. Emails, phones, and websites are each
    label/value pairs the user can grow with an "add another" button or trim
    via the per-row remove button.

    @param {Client} [client] - Client to edit. Omit for add mode.
    @param {(payload: Omit<Client, "id" | "position">) => void} onsave - Callback on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<script lang="ts">
    import { untrack, onDestroy } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add, Delete, Edit, Close } from "$lib/icons";
    import type { Client, ClientContact } from "$lib/types";
    import Button from "$lib/components/button.svelte";
    import {
        saveClientAvatar,
        deleteClientAvatar,
        AVATAR_ACCEPT,
        avatarSrc,
    } from "$lib/helpers/clients";

    type Props = {
        client?: Client;
        onsave: (payload: Omit<Client, "id" | "position">) => void;
        oncancel: () => void;
    };

    let { client, onsave, oncancel }: Props = $props();

    let isEdit: boolean = $derived(!!client);

    function seedList(list: ClientContact[] | null | undefined): ClientContact[] {
        if (list && list.length > 0) return list.map((c) => ({ ...c }));
        return [{ label: "", value: "" }];
    }

    let contactName: string = $state(untrack(() => client?.contact_name ?? ""));
    let companyName: string = $state(untrack(() => client?.company_name ?? ""));
    let mailingAddress: string = $state(untrack(() => client?.mailing_address ?? ""));
    let invoicePrefix: string = $state(untrack(() => client?.invoice_id_prefix ?? ""));
    let avatar: string | null = $state(untrack(() => client?.avatar ?? null));
    let avatarError: string = $state("");
    let emails: ClientContact[] = $state(untrack(() => seedList(client?.emails)));
    let phones: ClientContact[] = $state(untrack(() => seedList(client?.phones)));
    let websites: ClientContact[] = $state(untrack(() => seedList(client?.websites)));

    // files written to disk this session; uncommitted ones are cleaned up on
    // destroy so a cancelled or re-picked upload never orphans a file.
    const sessionFiles = new Set<string>();
    let committed = false;

    async function onAvatarPick(e: Event): Promise<void> {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ""; // allow re-picking the same file
        if (!file) return;
        avatarError = "";
        try {
            const name = await saveClientAvatar(file);
            if (avatar && sessionFiles.has(avatar)) {
                sessionFiles.delete(avatar);
                await deleteClientAvatar(avatar);
            }
            sessionFiles.add(name);
            avatar = name;
        } catch (err) {
            avatarError = err instanceof Error ? err.message : "Invalid image";
        }
    }

    async function removeAvatar(): Promise<void> {
        const name = avatar;
        avatar = null;
        avatarError = "";
        if (name && sessionFiles.has(name)) {
            sessionFiles.delete(name);
            await deleteClientAvatar(name);
        }
    }

    // stored filename resolves to an asset URL for preview
    let previewUrl: string | null = $state(null);
    $effect(() => {
        const value = avatar;
        if (!value) { previewUrl = null; return; }
        let active = true;
        avatarSrc(value)
            .then((resolved) => { if (active) previewUrl = resolved; })
            .catch(() => { if (active) previewUrl = null; });
        return () => { active = false; };
    });

    onDestroy(() => {
        for (const name of sessionFiles) {
            if (committed && name === avatar) continue; // kept by the save
            deleteClientAvatar(name);
        }
    });

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
        const name = contactName.trim();
        if (!name) return;
        committed = true; // the stored avatar is now referenced by a saved client
        onsave({
            contact_name: name,
            company_name: companyName.trim() || null,
            mailing_address: mailingAddress.trim() || null,
            avatar,
            emails: compact(emails),
            phones: compact(phones),
            websites: compact(websites),
            invoice_id_prefix: invoicePrefix.trim() || null,
        });
    }
</script>

<section>
    <p class="title">{isEdit ? "Edit" : "New"} Client</p>
    <form id="client-form" onsubmit={handleSubmit}>
        <div class="identity-row">
            <div class="avatar-col">
                <span class="lbl">Logo</span>
                <div class="avatar-frame">
                    <label
                        class="avatar-btn"
                        class:has-image={!!avatar}
                        title={avatar ? "Change photo" : "Add photo"}
                    >
                        <input
                            type="file"
                            accept={AVATAR_ACCEPT}
                            onchange={onAvatarPick}
                        />
                        {#if avatar}
                            {#if previewUrl}
                                <img src={previewUrl} alt="" />
                            {/if}
                            <span class="overlay" aria-hidden="true">
                                <Icon path={Edit} size="18" fill="var(--gray-10)" />
                            </span>
                        {:else}
                            <Icon path={Add} size="26" fill="var(--gray-30)" />
                        {/if}
                    </label>
                    {#if avatar}
                        <button
                            type="button"
                            class="avatar-remove"
                            title="Remove photo"
                            onclick={removeAvatar}
                        >
                            <Icon path={Close} size="14" fill="currentColor" />
                        </button>
                    {/if}
                </div>
                {#if avatarError}
                    <span class="avatar-err">{avatarError}</span>
                {/if}
            </div>

            <div class="fields-col">
                <label>
                    <span class="lbl">Contact Name *</span>
                    <input
                        type="text"
                        maxlength="40"
                        bind:value={contactName}
                        onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") oncancel(); }}
                    />
                </label>

                <label>
                    <span class="lbl">Company Name</span>
                    <input type="text" maxlength="60" bind:value={companyName} />
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
        {@render contactList(
            "Websites",
            websites,
            "label",
            "https://example.com",
            "url",
            (next) => (websites = next),
        )}

        <label>
            <span class="lbl">Invoice ID Prefix</span>
            <input
                type="text"
                placeholder="e.g. ACME-"
                maxlength="20"
                bind:value={invoicePrefix}
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

    .avatar-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .avatar-frame {
        position: relative;
        width: 100%;
    }

    .fields-col {
        flex: 3.7;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .avatar-btn {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        background-color: var(--gray-90);
        border: 1px solid var(--gray-70);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .avatar-btn:hover {
        border-color: var(--gray-60);
    }

    .avatar-btn:focus-within {
        border-color: var(--gray-50);
        outline: 2px solid var(--green);
        outline-offset: 2px;
    }

    /* visually hide native file input but keep it accessible */
    .avatar-btn input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .avatar-btn img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar-btn .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .avatar-btn.has-image:hover .overlay,
    .avatar-btn.has-image:focus-within .overlay {
        opacity: 1;
    }

    .avatar-remove {
        position: absolute;
        top: 5px;
        right: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.55);
        color: var(--gray-10);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .avatar-remove:hover {
        background: rgba(0, 0, 0, 0.7);
        color: var(--red);
    }

    .avatar-err {
        font-size: 0.68rem;
        line-height: 1.2;
        text-align: center;
        color: var(--red);
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
