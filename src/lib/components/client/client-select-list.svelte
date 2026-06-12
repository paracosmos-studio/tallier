<!--
    @component
    Single-select list of clients rendered as cards, each with a checkbox marker
    on the right. Clicking a card toggles its selection (selecting clears any
    other), so the active client can also be deselected. Each card shows the
    contact name (with company name in parentheses when present) and one contact
    detail as subtext, preferring email, then mailing address, then phone.

    Selecting a client checks it and plays a brief button-press animation; the
    list is locked while it plays and `oncomplete` fires when it finishes (use
    it to advance the flow).

    @param {Client[]} clients - Clients to list.
    @param {number} [selectedId] - Id of the selected client (bindable, may be cleared).
    @param {(id: number | undefined) => void} [onchange] - Fires immediately when the selection changes.
    @param {(id: number) => void} [oncomplete] - Fires when the press animation finishes.
-->

<script lang="ts">
    import type { Client } from "$lib/types";
    import { clientSubtext } from "$lib/helpers/clients";
    import ClientAvatar from "./client-avatar.svelte";

    type Props = {
        clients: Client[];
        selectedId?: number;
        onchange?: (id: number | undefined) => void;
        oncomplete?: (id: number) => void;
    };

    let { clients, selectedId = $bindable(), onchange, oncomplete }: Props = $props();

    let animatingId: number | undefined = $state(undefined);

    function select(id: number): void {
        if (animatingId !== undefined) return; // locked while drawing
        if (selectedId === id) {
            selectedId = undefined;
            onchange?.(undefined);
            return;
        }
        selectedId = id;
        onchange?.(id);
        animatingId = id; // kicks off the press animation
    }

    function finish(id: number): void {
        if (animatingId !== id) return;
        oncomplete?.(id);
        animatingId = undefined;
    }
</script>

<ul class="cs-list" class:locked={animatingId !== undefined}>
    {#each clients as client, i (client.id)}
        {@const sub = clientSubtext(client)}
        <li class="rise-in" style="--i: {i}">
            <label
                class="cs-card"
                class:animating={animatingId === client.id}
                onanimationend={() => finish(client.id!)}
            >
                <input
                    type="checkbox"
                    checked={selectedId === client.id}
                    disabled={animatingId !== undefined}
                    onchange={() => select(client.id!)}
                />
                <ClientAvatar src={client.avatar} name={client.contact_name} size={32} />
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

    .cs-list.locked {
        pointer-events: none;
    }

    .cs-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        background: var(--gray-90);
        border: 1px solid transparent;
        cursor: pointer;
        transform: scale(1);
        transition:
            border-color 0.15s ease,
            opacity 0.2s ease,
            transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        will-change: transform;
    }

    .cs-card:hover {
        border-color: var(--gray-70);
        transform: scale(1.01);
    }

    .cs-card.animating {
        animation: cs-press 0.4s ease-out;
    }

    @keyframes cs-press {
        0% {
            transform: scale(1);
        }
        30% {
            transform: scale(0.98);
        }
        62% {
            transform: scale(1.01);
        }
        100% {
            transform: scale(1);
        }
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
