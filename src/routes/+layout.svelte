<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { listen } from '@tauri-apps/api/event';
    import WindowControls from '$lib/components/window-controls.svelte';
    import WindowTitle from '$lib/components/window-title.svelte';
    import DialogConfirm from '$lib/components/dialogs/dialog-confirm.svelte';
    import DialogUpdate from '$lib/components/dialogs/dialog-update.svelte';
    import { runStartupUpdateCheck } from '$lib/updater.svelte';
    import { runStartupUsagePing } from '$lib/ping';
    import { beforeNavigate, goto } from '$app/navigation';
    import { initDB, getRunningTimer, stopTimer } from '$lib/db';
    import { page } from '$app/state';
    import { applyWindowProfile, type WindowProfile } from '$lib/window';

    import "$lib/styles/fonts.css";
    import "$lib/styles/global.css";

    let { children } = $props();
    let dbReady: boolean = $state(false);
    let rendering: boolean = $state(true);
    let showCloseConfirm: boolean = $state(false);
    let unlisten: (() => void) | undefined;
    let unlistenTray: (() => void) | undefined;
    let unlistenResize: (() => void) | undefined;

    const appWindow = getCurrentWindow();

    let activeProfile: WindowProfile = $derived((page.data.window ?? 'wide') as WindowProfile);

    $effect(() => {
        const profile = activeProfile;
        untrack(() => {
            document.body.classList.toggle('mode-compact', profile === 'compact');
            document.body.classList.toggle('mode-wide', profile === 'wide');
            applyWindowProfile(profile)
                .catch(() => {})
                .finally(() => { rendering = true; });
        });
    });

    beforeNavigate((nav) => {
        const next = (nav.to?.route?.id ?? '') as string;
        const nextProfile: WindowProfile = next === '/' ? 'compact' : 'wide';

        if (nextProfile !== activeProfile) {
            rendering = false;
        }
    });

    const blockContextMenu = (e: MouseEvent) => {
        const el = e.target instanceof HTMLElement ? e.target : null;
        if (el && (el.isContentEditable || el.closest('input, textarea'))) return;
        e.preventDefault();
    };

    const blockDevShortcuts = (e: KeyboardEvent) => {
        const reload = e.code === 'F5' || ((e.metaKey || e.ctrlKey) && e.code === 'KeyR');
        const devtools = e.code === 'F12'
            || ((e.metaKey || e.ctrlKey) && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC'].includes(e.code))
            || (e.metaKey && e.altKey && e.code === 'KeyI');
        if (reload || devtools) e.preventDefault();
    };

    onMount(() => {
        if (!import.meta.env.DEV) {
            window.addEventListener('contextmenu', blockContextMenu);
            window.addEventListener('keydown', blockDevShortcuts);
        }

        initDB().then(() => {
            dbReady = true;
            // both need the DB for their settings; fire-and-forget
            runStartupUpdateCheck().catch(() => {});
            runStartupUsagePing().catch(() => {});
        });

        appWindow.onCloseRequested(async (e) => {
            const running = await getRunningTimer();
            if (running) {
                e.preventDefault();
                showCloseConfirm = true;
            }
        }).then((fn) => unlisten = fn);

        const syncFullscreen = async () => {
            try {
                const fs = await appWindow.isFullscreen();
                document.body.classList.toggle('is-fullscreen', fs);
            } catch {}
        };
        syncFullscreen();
        appWindow.onResized(syncFullscreen).then((fn) => unlistenResize = fn);

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
            unlistenResize?.();
            window.removeEventListener('contextmenu', blockContextMenu);
            window.removeEventListener('keydown', blockDevShortcuts);
        };
    });

    async function forceClose() {
        const running = await getRunningTimer();
        if (running?.id != null) await stopTimer(running.id);
        showCloseConfirm = false;
        unlisten?.();
        await appWindow.destroy();
    }
</script>

<div class="titlebar" data-tauri-drag-region>
    <WindowControls />
    <WindowTitle />
</div>

<div class="app-content-wrapper">
    <div class="app-content">
        {#if dbReady && rendering}
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

<DialogUpdate />

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

    /* container query host so components can react to content width
       independent of OS window width (better than viewport queries). */
    .app-content {
        margin: 0 auto;
        padding: 2rem 0.65rem 0.65rem;
        box-sizing: border-box;
        container-type: inline-size;
        container-name: app;
    }

    :global(body.mode-compact) .app-content {
        max-width: 400px;
    }

    :global(body.mode-wide) .app-content {
        max-width: 1200px;
        padding: 2rem 0.85rem 0.85rem;
    }

    :global(body.is-fullscreen) .titlebar {
        border: none;
        border-radius: 0;
    }

    :global(body.is-fullscreen) .app-content-wrapper {
        border: none;
        border-radius: 0;
    }
</style>