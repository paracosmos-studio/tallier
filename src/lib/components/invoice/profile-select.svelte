<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Single profile chooser styled like one client-select card: avatar with the
    profile label and business name on the left, and on the right a control
    cluster pairing an edit icon button with the primitive Select dropdown of
    profile labels. Picking from the dropdown swaps the displayed profile; the
    edit button requests an inline edit of the current selection.

    @param {Profile[]} profiles - Selectable profiles (dropdown options).
    @param {Profile} [selected] - Currently selected profile.
    @param {(profile: Profile) => void} [onchange] - Fires when the dropdown picks a profile.
    @param {() => void} [onedit] - Fires when the edit icon is pressed.
    @param {() => void} [onadd] - Fires from the empty-state "Add Profile" button.
-->
<script lang="ts">
    import Select from "$lib/components/select.svelte";
    import Icon from "$lib/components/icon.svelte";
    import Button from "$lib/components/button.svelte";
    import ClientAvatar from "$lib/components/client/client-avatar.svelte";
    import { Edit, Add } from "$lib/icons";
    import { firstContactValue } from "$lib/helpers/clients";
    import type { Profile } from "$lib/types";

    type Props = {
        profiles: Profile[];
        selected?: Profile;
        onchange?: (profile: Profile) => void;
        onedit?: () => void;
        onadd?: () => void;
    };

    let { profiles, selected, onchange, onedit, onadd }: Props = $props();

    let isEmpty = $derived(profiles.length === 0);

    let options = $derived(profiles.map((p) => ({ value: String(p.id), label: p.label })));
    let subtext = $derived(
        selected
            ? firstContactValue(selected.emails) ??
              selected.mailing_address ??
              firstContactValue(selected.phones)
            : null,
    );

    function handlePick(value: string): void {
        const next = profiles.find((p) => String(p.id) === value);
        if (next) onchange?.(next);
    }
</script>

<div class="ps-card">
    {#if selected}
        <ClientAvatar src={selected.logo} name={selected.business_name} size={32} />
        <span class="ps-info">
            <span class="ps-name">{selected.business_name}</span>
            {#if subtext}
                <span class="ps-sub">{subtext}</span>
            {/if}
        </span>
    {:else}
        <span class="ps-placeholder">No sender profile yet</span>
    {/if}

    {#if isEmpty}
        <Button size="xs" title="Add a sender profile" onclick={() => onadd?.()}>
            <Icon path={Add} size="14" fill="currentColor" />
            <span>Add Profile</span>
        </Button>
    {:else}
        <div class="ps-actions">
            <button
                type="button"
                class="ps-edit"
                title="Edit profile"
                disabled={!selected}
                onclick={onedit}
            >
                <Icon path={Edit} size="18" fill="currentColor" />
            </button>
            <div class="ps-select">
                <Select
                    {options}
                    size="sm"
                    placeholder="Choose"
                    value={selected ? String(selected.id) : ""}
                    onchange={handlePick}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .ps-card {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        background: var(--gray-90);
        border: 1px solid transparent;
    }

    .ps-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .ps-name {
        font-size: 14px;
        color: var(--gray-10);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .ps-sub {
        font-size: 0.72rem;
        color: var(--gray-30);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .ps-placeholder {
        flex: 1;
        font-size: 14px;
        color: var(--gray-40);
    }

    .ps-actions {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .ps-edit {
        display: flex;
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--gray-30);
        transition: color 0.2s ease;
    }

    .ps-edit:hover:not(:disabled) {
        color: var(--yellow);
    }

    .ps-edit:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .ps-select {
        width: 150px;
    }
</style>
