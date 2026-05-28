<!--
    @component
    Displays the saved clients. Clicking a row opens the edit form; the
    trailing delete button removes the client (after confirm dialog).

    @param {Client[]} clients - Array of clients to display.
    @param {(client: Client) => void} onedit - Callback when a row is clicked.
    @param {(client: Client) => void} ondelete - Callback when delete clicked.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Delete } from "$lib/icons";
    import type { Client } from "$lib/types";

    type Props = {
        clients: Client[];
        onedit: (client: Client) => void;
        ondelete: (client: Client) => void;
    };

    let { clients, onedit, ondelete }: Props = $props();
</script>

<section>
    {#if clients.length === 0}
        <p class="empty">No clients yet.</p>
    {:else}
        <ul class="cl-list">
            {#each clients as client (client.id)}
                <li class="cl-item">
                    <button
                        type="button"
                        class="cl-info"
                        onclick={() => onedit(client)}
                        title="Edit client"
                    >
                        <span class="cl-name">{client.contact_name}</span>
                        {#if client.company_name}
                            <span class="cl-company">{client.company_name}</span>
                        {/if}
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
    p.empty {
        font-size: 14px;
        color: var(--gray-40);
        text-align: center;
        margin: 2rem 0;
    }

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
        justify-content: space-between;
        align-items: center;
        padding: 5px 5px 5px 10px;
        border-radius: 4px;
        background-color: var(--gray-90);
    }

    .cl-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: var(--gray-10);
        cursor: pointer;
        text-align: left;
    }

    .cl-name {
        font-size: 14px;
        color: var(--gray-10);
    }

    .cl-company {
        font-size: 0.72rem;
        color: var(--gray-30);
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
