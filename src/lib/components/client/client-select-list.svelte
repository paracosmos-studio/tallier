<!--
    @component
    Single-select list of clients rendered as cards, each with a checkbox marker
    on the right. Clicking a card toggles its selection (selecting clears any
    other), so the active client can also be deselected. Each card shows the
    contact name (with company name in parentheses when present) and one contact
    detail as subtext, preferring email, then website, then mailing address.

    @param {Client[]} clients - Clients to list.
    @param {number} [selectedId] - Id of the selected client (bindable, may be cleared).
    @param {(id: number | undefined) => void} [onchange] - Fires when the selection changes.
-->

<script lang="ts">
    import type { Client, ClientContact } from "$lib/types";

    type Props = {
        clients: Client[];
        selectedId?: number;
        onchange?: (id: number | undefined) => void;
    };

    let { clients, selectedId = $bindable(), onchange }: Props = $props();

    function firstValue(list: ClientContact[] | null): string | null {
        return list?.find((c) => c.value.trim())?.value.trim() ?? null;
    }

    function subtext(c: Client): string | null {
        return firstValue(c.emails) ?? firstValue(c.websites) ?? c.mailing_address;
    }

    function toggle(id: number): void {
        selectedId = selectedId === id ? undefined : id;
        onchange?.(selectedId);
    }
</script>

<ul class="cs-list">
    {#each clients as client (client.id)}
        {@const sub = subtext(client)}
        <li>
            <label class="cs-card">
                <input
                    type="checkbox"
                    checked={selectedId === client.id}
                    onchange={() => toggle(client.id!)}
                />
                <span class="cs-info">
                    <span class="cs-name">
                        {client.contact_name}
                        {#if client.company_name}
                            <span class="cs-company">• {client.company_name}</span>
                        {/if}
                    </span>
                    {#if sub}
                        <span class="cs-sub">{sub}</span>
                    {/if}
                </span>
                <span class="indicator" aria-hidden="true"></span>
            </label>
        </li>
    {/each}
</ul>

<style>
    .cs-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .cs-card {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 12px;
        border-radius: 6px;
        background: var(--gray-90);
        border: 1px solid transparent;
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .cs-card:hover {
        border-color: var(--gray-70);
    }

    /* visually hide native input but keep it accessible */
    input {
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

    .cs-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .cs-name {
        font-size: 14px;
        color: var(--gray-10);
    }

    .cs-company {
        color: var(--gray-30);
    }

    .cs-sub {
        font-size: 0.72rem;
        color: var(--gray-30);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .indicator {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border: 1.5px solid var(--gray-50);
        border-radius: 50%;
        background: var(--gray-80);
        box-sizing: border-box;
        position: relative;
        transition: border-color 0.15s ease, background 0.15s ease;
    }

    .cs-card:hover input:not(:checked) ~ .indicator {
        border-color: var(--gray-30);
    }

    input:focus-visible ~ .indicator {
        outline: 2px solid var(--green);
        outline-offset: 2px;
    }

    input:checked ~ .indicator {
        background: var(--green);
        border-color: var(--green);
    }

    input:checked ~ .indicator::after {
        content: "";
        position: absolute;
        left: 4.5px;
        top: 2px;
        width: 4px;
        height: 8px;
        border: solid var(--color-background);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }
</style>
