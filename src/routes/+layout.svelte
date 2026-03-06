<script lang="ts">
    import { onMount } from 'svelte';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { listen } from '@tauri-apps/api/event';
    import WindowControls from '$lib/components/window-controls.svelte';
    import WindowTitle from '$lib/components/window-title.svelte';
    import DialogConfirm from '$lib/components/dialogs/dialog-confirm.svelte';
    import { goto } from '$app/navigation';
    import { initDB, getRunningTimer, stopTimer } from '$lib/db';
    import { page } from '$app/state';

    import "$lib/styles/fonts.css";
    import "$lib/styles/global.css";

    let { children } = $props();
    let dbReady: boolean = $state(false);
    let showCloseConfirm: boolean = $state(false);
    let unlisten: (() => void) | undefined;
    let unlistenTray: (() => void) | undefined;

    const appWindow = getCurrentWindow();

    onMount(() => {
        initDB().then(() => dbReady = true);

        appWindow.onCloseRequested(async (e) => {
            const running = await getRunningTimer();
            if (running) {
                e.preventDefault();
                showCloseConfirm = true;
            }
        }).then((fn) => unlisten = fn);

        listen<string>("tray-menu-action", async (event) => {
            const payload = event.payload;
            if (payload === "quit") {
                const running = await getRunningTimer();
                if (running) {
                    const w = getCurrentWindow();
                    await w.show();
                    await w.setFocus();
                    showCloseConfirm = true;
                } else {
                    forceClose();
                }
            } else if (payload === "settings") {
                goto('/settings');
            } else if (payload === "stop_timer" || payload === "start_timer" || payload.startsWith("select_project:")) {
                if (page.url.pathname !== '/') {
                    await goto(`/?tray=${payload}`);
                }
            }
        }).then((fn) => unlistenTray = fn);

        return () => {
            unlisten?.();
            unlistenTray?.();
        };
    });

    async function forceClose() {
        const running = await getRunningTimer();
        if (running?.id != null) await stopTimer(running.id);
        showCloseConfirm = false;
        unlisten?.();
        appWindow.close();
    }
</script>

<div class="titlebar" data-tauri-drag-region>
    <WindowControls />
    <WindowTitle />
</div>

<div class="app-content-wrapper" class:spacing={page.url.pathname !== "/"}>
    <div class="app-content">
        {#if dbReady}
            {@render children()}
        {/if}
    </div>
</div>

<DialogConfirm
    open={showCloseConfirm}
    title="Timer Running"
    message="A timer is still running. Are you sure you want to close the app?"
    confirmLabel="Stop & Close"
    onconfirm={forceClose}
    oncancel={() => showCloseConfirm = false}
/>

<style>
    .titlebar {
        height: 30px;
        background: var(--color-background);
        user-select: none;
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        border: 1px solid var(--gray-60);
        border-bottom: none;
        border-radius: 15px 15px 0 0;
        padding: 0.4rem 0.65rem;
        box-sizing: border-box;
        z-index: 10;
    }

    /* used for dark background in fullscreen */
    .app-content-wrapper {
        background: var(--color-background);
        border: 1px solid var(--gray-60);
        border-top: none;
        border-radius: 15px;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    /* used for setting paddings, and max-width on large window */
    .app-content {
        margin: 0 auto;
        padding: 2rem 0.65rem 0.65rem;
        box-sizing: border-box;
    }

    .spacing {
        padding: 0rem 0.35rem;
    }

    @media screen and (min-width: 800px) {
        .titlebar {
            border: none;
        }

        .app-content-wrapper {
            border: none;
            border-radius: 0;
        }

        .app-content {
            max-width: 400px;
            margin: 0 auto;
        }
    }
</style>