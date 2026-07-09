<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Full-window modal that fills the entire viewport with the app's background,
    keeping the window's edge border and corner radius.
    A close icon sits in the top-right unless suppressed. Use this for
    celebratory or focused single-purpose scenes (e.g. export success
    animation); for forms or confirmations reach for `dialog.svelte` /
    `dialog-confirm.svelte` instead.

    @param {boolean} open - controls visibility.
    @param {boolean} [dismissible=true] - whether Escape closes the dialog.
    @param {boolean} [showCloseIcon=true] - whether to render the close icon (independent of `dismissible`).
    @param {number | null} [autoCloseMs=null] - if set, auto-fires `onclose` after this many ms from open.
    @param {() => void} onclose - callback when dismissed (manually or via auto-close).
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Close } from "$lib/icons";

    type Props = {
        children: () => any;
        open: boolean;
        dismissible?: boolean;
        showCloseIcon?: boolean;
        autoCloseMs?: number | null;
        onclose: () => void;
    };

    let {
        children,
        open,
        dismissible = true,
        showCloseIcon = true,
        autoCloseMs = null,
        onclose,
    }: Props = $props();

    let dialogEl: HTMLDialogElement | undefined = $state();

    // showModal() puts the dialog in the top layer and inerts the rest of
    // the document. that intentionally blocks scrolling and titlebar drag
    // while the dialog is open.
    $effect(() => {
        if (!dialogEl) return;
        if (open && !dialogEl.open) {
            dialogEl.showModal();
        } else if (!open && dialogEl.open) {
            dialogEl.close();
        }
    });

    // schedule auto-dismiss while open
    $effect(() => {
        if (!open || !autoCloseMs || autoCloseMs <= 0) return;
        const id = setTimeout(() => onclose(), autoCloseMs);
        return () => clearTimeout(id);
    });

    function handleCancel(e: Event): void {
        e.preventDefault();
        if (dismissible) onclose();
    }
</script>

<dialog
    bind:this={dialogEl}
    oncancel={handleCancel}
    aria-label="Fullscreen overlay"
>
    {#if showCloseIcon}
        <button class="close" title="Close" onclick={onclose}>
            <Icon path={Close} size="22" fill="currentColor" />
        </button>
    {/if}
    <div class="scene">
        {@render children()}
    </div>
</dialog>

<style>
    /* titlebar height defined in src/routes/+layout.svelte */
    dialog {
        --titlebar-h: 30px;
        position: fixed;
        top: var(--titlebar-h);
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: calc(100vh - var(--titlebar-h));
        max-width: 100vw;
        max-height: calc(100vh - var(--titlebar-h));
        margin: 0;
        padding: 0;
        border: 1px solid var(--gray-60);
        border-top: none;
        border-radius: 0 0 15px 15px;
        background: var(--color-background);
        color: var(--gray-10);
        overflow: hidden;
    }

    /* match the layout's flattening when the OS window goes fullscreen */
    :global(body.is-fullscreen) dialog {
        border: none;
        border-radius: 0;
    }

    dialog::backdrop {
        background: transparent;
    }

    .close {
        position: absolute;
        top: 14px;
        right: 14px;
        background: none;
        border: none;
        padding: 6px;
        cursor: pointer;
        color: var(--gray-30);
        display: flex;
        z-index: 1;
        transition: color 0.15s ease;
        outline: none;
    }

    .close:hover,
    .close:focus {
        color: var(--gray-10);
    }

    .scene {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
