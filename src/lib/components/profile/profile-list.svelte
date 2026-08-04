<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Displays a draggable list of saved sender profiles. Each row shows the logo
    and the profile label with the business name beside it. Clicking a row opens
    the edit form; the drag handle reorders; the trailing delete button removes
    the profile (after confirm dialog).

    @param {Profile[]} profiles - Array of profiles to display.
    @param {(profile: Profile) => void} onedit - Callback when a row is clicked.
    @param {(profile: Profile) => void} ondelete - Callback when delete clicked.
    @param {(profiles: Profile[]) => void} onreorder - Callback with reordered profile array after drag.
    @param {() => void} [onadd] - Optional callback invoked from the empty state's call-to-action.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import ClientAvatar from "$lib/components/client/client-avatar.svelte";
    import { Delete, Person, Add, Drag } from "$lib/icons";
    import type { Profile } from "$lib/types";

    type Props = {
        profiles: Profile[];
        onedit: (profile: Profile) => void;
        ondelete: (profile: Profile) => void;
        onreorder: (profiles: Profile[]) => void;
        onadd?: () => void;
    };

    let { profiles, onedit, ondelete, onreorder, onadd }: Props = $props();

    let dragIdx: number | null = $state(null);
    let overIdx: number | null = $state(null);
    let dragging: boolean = $state(false);

    function handlePointerDown(idx: number) {
        dragIdx = idx;
        dragging = true;

        function handlePointerMove(e: PointerEvent) {
            const items = document.querySelectorAll(".pf-list .pf-item");
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
                const reordered = [...profiles];
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
    {#if profiles.length === 0}
        <EmptyState
            icon={Person}
            title="No profiles yet"
            description="Profiles are used as Sender Identities when creating Invoices for your Clients."
            actionLabel={onadd ? "Add Profile" : undefined}
            actionIcon={onadd ? Add : undefined}
            onaction={onadd}
        />
    {:else}
        <p class="note">Profiles are used as Sender Identities when creating Invoices for your Clients.</p>
        <ul class="pf-list">
            {#each profiles as profile, idx (profile.id)}
                <li
                    class="pf-item rise-in"
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
                        class="pf-info"
                        onclick={() => onedit(profile)}
                        title="Edit profile"
                    >
                        <ClientAvatar src={profile.logo} name={profile.label} />
                        <span class="pf-text">
                            <span class="pf-name">
                                {profile.label}
                                <span class="pf-company">• {profile.business_name}</span>
                            </span>
                        </span>
                    </button>
                    <div class="pf-actions">
                        <button
                            title="Delete"
                            class="delete"
                            onclick={() => ondelete(profile)}
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
    .note {
        margin: 0 0 12px 0;
        font-size: 0.72rem;
        line-height: 1.4;
        color: var(--gray-30);
    }

    .pf-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .pf-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px;
        border-radius: 4px;
        background-color: var(--gray-90);
        transition: opacity 0.15s ease;
    }

    .pf-item.dragging {
        opacity: 0.4;
    }

    .pf-item.drag-over-top {
        border-top: 2px solid var(--yellow);
        padding-top: 3px;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .pf-item.drag-over-bottom {
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

    .pf-info {
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

    .pf-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .pf-name {
        font-size: 14px;
        color: var(--gray-10);
    }

    .pf-company {
        color: var(--gray-30);
    }

    .pf-actions {
        display: flex;
        gap: 2px;
    }

    .pf-actions button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--gray-30);
        transition: color 0.2s ease;
    }

    .pf-actions button.delete:hover {
        color: var(--red);
    }
</style>
