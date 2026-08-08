<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Displays a draggable list of saved clients. Each row shows the avatar, the
    contact name (with company name beside it when present) and one contact
    detail as subtext, preferring email, then mailing address, then phone.
    Clicking a row opens the edit form; the drag handle reorders; the trailing
    delete button removes the client (after confirm dialog).

    @param {Client[]} clients - Array of clients to display.
    @param {(client: Client) => void} onedit - Callback when a row is clicked.
    @param {(client: Client) => void} ondelete - Callback when delete clicked.
    @param {(clients: Client[]) => void} onreorder - Callback with reordered client array after drag.
    @param {() => void} [onadd] - Optional callback invoked from the empty state's call-to-action.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import ClientAvatar from "./client-avatar.svelte";
    import { Delete, WorkOutlined, Add, Drag } from "$lib/icons";
    import { clientDisplayName, clientSubtext } from "$lib/helpers/clients";
    import type { Client } from "$lib/types";

    type Props = {
        clients: Client[];
        onedit: (client: Client) => void;
        ondelete: (client: Client) => void;
        onreorder: (clients: Client[]) => void;
        onadd?: () => void;
    };

    let { clients, onedit, ondelete, onreorder, onadd }: Props = $props();

    let dragIdx: number | null = $state(null);
    let overIdx: number | null = $state(null);
    let dragging: boolean = $state(false);

    function handlePointerDown(idx: number) {
        dragIdx = idx;
        dragging = true;

        function handlePointerMove(e: PointerEvent) {
            const items = document.querySelectorAll(".cl-list .cl-item");
            let closest: number = 0;
            let minDist: number = Infinity;
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - mid);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            }
            overIdx = closest;
        }

        function handlePointerUp() {
            if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                const reordered = [...clients];
                const [moved] = reordered.splice(dragIdx, 1);
                reordered.splice(overIdx, 0, moved);
                onreorder(reordered);
            }
            dragIdx = null;
            overIdx = null;
            dragging = false;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }
</script>

<section>
    {#if clients.length === 0}
        <EmptyState
            icon={WorkOutlined}
            title="No clients yet"
            description="Save client contacts to attach them to invoices and keep billing details in one place."
            actionLabel={onadd ? "Add Client" : undefined}
            actionIcon={onadd ? Add : undefined}
            onaction={onadd}
        />
    {:else}
        <ul class="cl-list">
            {#each clients as client, idx (client.id)}
                {@const sub = clientSubtext(client)}
                <li
                    class="cl-item rise-in"
                    style="--i: {idx}"
                    class:drag-over-top={dragging && overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx > idx}
                    class:drag-over-bottom={dragging && overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx < idx}
                    class:dragging={dragging && dragIdx === idx}
                >
                    <span
                        class="drag-handle"
                        onpointerdown={() => handlePointerDown(idx)}
                        role="button"
                        tabindex="0"
                        aria-label="Drag to reorder"
                    >
                        <Icon path={Drag} size="20" fill="var(--gray-50)" />
                    </span>
                    <button
                        type="button"
                        class="cl-info"
                        onclick={() => onedit(client)}
                        title="Edit client"
                    >
                        <ClientAvatar src={client.avatar} name={clientDisplayName(client)} />
                        <span class="cl-text">
                            <span class="cl-name">
                                {clientDisplayName(client)}
                                {#if client.contact_name && client.company_name}
                                    <span class="cl-company">• {client.company_name}</span>
                                {/if}
                            </span>
                            {#if sub}
                                <span class="cl-sub">{sub}</span>
                            {/if}
                        </span>
                    </button>
                    <div class="cl-actions">
                        <button
                            title="Delete"
                            class="delete"
                            onclick={() => ondelete(client)}
                        >
                            <Icon path={Delete} size="20" fill="currentColor" />
                        </button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</section>

<style>
    .cl-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .cl-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px;
        border-radius: 4px;
        background-color: var(--gray-90);
        transition: opacity 0.15s ease;
    }

    .cl-item.dragging {
        opacity: 0.4;
    }

    .cl-item.drag-over-top {
        border-top: 2px solid var(--yellow);
        padding-top: 3px;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .cl-item.drag-over-bottom {
        border-bottom: 2px solid var(--yellow);
        padding-bottom: 3px;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .drag-handle {
        display: flex;
        cursor: grab;
        touch-action: none;
    }

    .cl-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: var(--gray-10);
        cursor: pointer;
        text-align: left;
    }

    .cl-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .cl-name {
        font-size: 14px;
        color: var(--gray-10);
    }

    .cl-company {
        color: var(--gray-30);
    }

    .cl-sub {
        font-size: 0.72rem;
        color: var(--gray-30);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .cl-actions {
        display: flex;
        gap: 2px;
    }

    .cl-actions button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--gray-30);
        transition: color 0.2s ease;
    }

    .cl-actions button.delete:hover {
        color: var(--red);
    }
</style>
