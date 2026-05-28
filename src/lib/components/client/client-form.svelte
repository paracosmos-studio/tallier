<!--
    @component
    Form for adding or editing a client. Emails, phones, and websites are each
    label/value pairs the user can grow with an "add another" button or trim
    via the per-row remove button.

    @param {Client} [client] - Client to edit. Omit for add mode.
    @param {(payload: Omit<Client, "id">) => void} onsave - Callback on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<script lang="ts">
    import { untrack } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add, Close } from "$lib/icons";
    import type { Client, ClientContact } from "$lib/types";

    type Props = {
        client?: Client;
        onsave: (payload: Omit<Client, "id">) => void;
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
    let emails: ClientContact[] = $state(untrack(() => seedList(client?.emails)));
    let phones: ClientContact[] = $state(untrack(() => seedList(client?.phones)));
    let websites: ClientContact[] = $state(untrack(() => seedList(client?.websites)));

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
        onsave({
            contact_name: name,
            company_name: companyName.trim() || null,
            mailing_address: mailingAddress.trim() || null,
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
        <div class="name-row">
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
                    <button
                        type="button"
                        class="add-another"
                        onclick={() => setter(addRow(list))}
                    >
                        <Icon path={Add} size="12" fill="currentColor" />
                        <span>Add</span>
                    </button>
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
                        <button
                            type="button"
                            class="row-btn remove"
                            title="Remove"
                            aria-label="Remove"
                            onclick={() => setter(removeRow(list, idx))}
                        >
                            <Icon path={Close} size="18" fill="currentColor" />
                        </button>
                    </div>
                {/each}
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

    .name-row {
        display: flex;
        gap: 0.6rem;
    }

    .name-row label {
        flex: 1;
        min-width: 0;
    }

    .lbl {
        font-size: 0.75rem;
        color: var(--gray-30);
    }

    .contact-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
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

    .row-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        background-color: var(--gray-90);
        border: none;
        border-radius: 4px;
        color: var(--gray-30);
        padding: 2px;
        cursor: pointer;
        transition: color 0.15s ease, border-color 0.15s ease;
    }

    .row-btn.remove:hover {
        color: var(--red);
        background-color: var(--gray-80);
    }

    .add-another {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        padding: 0;
        color: var(--gray-20);
        font-family: inherit;
        font-size: 0.75rem;
        cursor: pointer;
        transition: color 0.15s ease;
    }

    .add-another:hover {
        color: var(--yellow);
    }
</style>
