<!--
    @component
    Reusable modal dialog with header, body, and footer slots.

    @param {boolean} open - Controls dialog visibility.
    @param {string} [title=""] - Header title text.
    @param {boolean} [dismissible=true] - Whether the dialog can be closed via close icon, Escape, or backdrop click.
    @param {string} [width] - Optional preferred width (e.g. "520px"). Capped by 90vw.
    @param {() => void} onclose - Callback when dialog is closed.
-->

<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Close } from "$lib/icons";

    type Props = {
        children: () => any;
        footer?: () => any;
        open: boolean;
        title?: string;
        dismissible?: boolean;
        width?: string;
        onclose: () => void;
    };

    let { children, footer, open, title = "", dismissible = true, width, onclose }: Props = $props();

    let dialogEl: HTMLDialogElement | undefined = $state(undefined);

    $effect(() => {
        if (!dialogEl) return;
        if (open && !dialogEl.open) {
            dialogEl.showModal();
        } else if (!open && dialogEl.open) {
            dialogEl.close();
        }
    });

    function handleCancel(e: Event) {
        e.preventDefault();
        if (dismissible) onclose();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (dismissible && e.target === dialogEl) onclose();
    }
</script>

<dialog
    bind:this={dialogEl}
    oncancel={handleCancel}
    onclick={handleBackdropClick}
    aria-label={title || "Dialog"}
>
    <div class="dialog-inner" style:width={width ?? ""}>
        <header>
            {#if title}
                <h2>{title}</h2>
            {/if}
            {#if dismissible}
                <button class="close" title="Close" onclick={onclose}>
                    <Icon path={Close} size="20" fill="currentColor" />
                </button>
            {/if}
        </header>
        <div class="body">
            {@render children()}
        </div>
        {#if footer}
            <footer>
                {@render footer()}
            </footer>
        {/if}
    </div>
</dialog>

<style>
    dialog {
        padding: 0;
        background: transparent;
        max-width: 90vw;
        overflow: visible;
        border: none;
    }

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.6);
        border-radius: 15px;
    }

    .dialog-inner {
        background: var(--gray-80);
        border: 1px solid var(--gray-60);
        border-radius: 10px;
        min-width: min(380px, 90vw);
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 8px;
        flex-shrink: 0;
    }

    header h2 {
        font-size: 14px;
        font-weight: 600;
        color: var(--gray-10);
        margin: 0;
    }

    .close {
        background: none;
        border: none;
        padding: 4px 0px;
        cursor: pointer;
        color: var(--gray-30);
        transition: color 0.2s ease;
        display: flex;
        margin-left: auto;
        outline: none;
    }

    .close:hover,
    .close:focus {
        color: var(--gray-10);
    }

    .body {
        padding: 0 16px;
        flex: 0 1 auto;
        min-height: 0;
        overflow-y: auto;
        color: var(--gray-10);
        font-size: 14px;
    }

    .body::-webkit-scrollbar {
        width: 6px;
    }

    .body::-webkit-scrollbar-track {
        background: transparent;
    }

    .body::-webkit-scrollbar-thumb {
        background: var(--gray-60);
        border-radius: 3px;
    }

    .body::-webkit-scrollbar-thumb:hover {
        background: var(--gray-50);
    }

    footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px;
        flex-shrink: 0;
    }
</style>
