<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Square image picker for an avatar/logo. Wraps the file input, validation,
    preview, and orphan-file cleanup so any form can store an image with one
    bindable filename. Files written this session are deleted on destroy unless
    `commit()` is called (the parent does this once the value is persisted).

    @param {string | null} value - Bindable stored filename (null when empty).
    @param {string} [label="Logo"] - Field label shown above the picker.
-->
<script lang="ts">
    import { onDestroy } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add, Edit, Close } from "$lib/icons";
    import {
        saveClientAvatar,
        deleteClientAvatar,
        AVATAR_ACCEPT,
        avatarSrc,
    } from "$lib/helpers/clients";

    type Props = {
        value: string | null;
        label?: string;
    };

    let { value = $bindable(), label = "Logo" }: Props = $props();

    let avatarError: string = $state("");

    // files written to disk this session; uncommitted ones are cleaned up on
    // destroy so a cancelled or re-picked upload never orphans a file.
    const sessionFiles = new Set<string>();
    let committed = false;

    /** marks the current value as kept so destroy won't delete it. */
    export function commit(): void {
        committed = true;
    }

    async function onPick(e: Event): Promise<void> {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ""; // allow re-picking the same file
        if (!file) return;
        avatarError = "";
        try {
            const name = await saveClientAvatar(file);
            if (value && sessionFiles.has(value)) {
                sessionFiles.delete(value);
                await deleteClientAvatar(value);
            }
            sessionFiles.add(name);
            value = name;
        } catch (err) {
            avatarError = err instanceof Error ? err.message : "Invalid image";
        }
    }

    async function remove(): Promise<void> {
        const name = value;
        value = null;
        avatarError = "";
        if (name && sessionFiles.has(name)) {
            sessionFiles.delete(name);
            await deleteClientAvatar(name);
        }
    }

    // stored filename resolves to an asset URL for preview
    let previewUrl: string | null = $state(null);
    $effect(() => {
        const name = value;
        if (!name) { previewUrl = null; return; }
        let active = true;
        avatarSrc(name)
            .then((resolved) => { if (active) previewUrl = resolved; })
            .catch(() => { if (active) previewUrl = null; });
        return () => { active = false; };
    });

    onDestroy(() => {
        for (const name of sessionFiles) {
            if (committed && name === value) continue; // kept by the save
            deleteClientAvatar(name);
        }
    });
</script>

<div class="avatar-col">
    <span class="lbl">{label}</span>
    <div class="avatar-frame">
        <label
            class="avatar-btn"
            class:has-image={!!value}
            title={value ? "Change photo" : "Add photo"}
        >
            <input type="file" accept={AVATAR_ACCEPT} onchange={onPick} />
            {#if value}
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
        {#if value}
            <button
                type="button"
                class="avatar-remove"
                title="Remove photo"
                onclick={remove}
            >
                <Icon path={Close} size="14" fill="currentColor" />
            </button>
        {/if}
    </div>
    {#if avatarError}
        <span class="avatar-err">{avatarError}</span>
    {/if}
</div>

<style>
    .avatar-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .lbl {
        font-size: 0.75rem;
        color: var(--gray-30);
    }

    .avatar-frame {
        position: relative;
        width: 100%;
    }

    .avatar-btn {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        background-color: var(--field-bg);
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
</style>
