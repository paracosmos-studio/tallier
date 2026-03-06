<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { listen } from "@tauri-apps/api/event";
    import { getProjects, startTimer, stopTimer, createEntry, updateEntrySummary, getEntryByTimerId, getRunningTimer, getTodayProjectTotal, getSetting } from "$lib/db";
    import { setTrayTimer } from "$lib/tray";
    import type { TrayProject } from "$lib/tray";
    import Select from "$lib/components/select.svelte";
    import Menu from "$lib/components/menu.svelte";
    import Timer from "$lib/components/timer.svelte";
    import DialogSummary from "$lib/components/dialogs/dialog-summary.svelte";
    import { resizeWindow } from "$lib/window";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import type { Project } from "$lib/types";

    let selectedProject = $state("");
    let projects: Project[] = $state([]);
    let trayOrder: number[] = $state([]);
    let projectOptions = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );
    let timerDisabled = $derived(selectedProject === "");

    let running: { timerId: number; startedAt: Date } | null = $state(null);
    let todayTotal = $state(0);
    let stoppedTimerId: number | null = $state(null);
    let showTrayTitle: boolean = $state(false);
    let unlistenTray: (() => void) | undefined;

    function getTrayProjects(): TrayProject[] {
        return trayOrder
            .map(id => projects.find(p => p.id === id))
            .filter((p): p is Project => p != null)
            .map(p => ({ id: p.id!, name: p.name }));
    }

    function syncTray() {
        const tp = getTrayProjects();
        const selId = selectedProject ? Number(selectedProject) : undefined;
        if (running) {
            setTrayTimer(todayTotal, running.startedAt.getTime(), tp, selId, showTrayTitle).catch(() => {});
        } else {
            setTrayTimer(todayTotal, undefined, tp, selId, showTrayTitle).catch(() => {});
        }
    }

    async function refreshTodayTotal() {
        if (selectedProject) {
            todayTotal = await getTodayProjectTotal(Number(selectedProject));
        } else {
            todayTotal = 0;
        }
    }

    onMount(async () => {
        projects = await getProjects();
        trayOrder = projects.map(p => p.id!);
        showTrayTitle = (await getSetting("taskbarDisplay")) === "true";

        const existing = await getRunningTimer();

        if (existing && existing.id !== undefined) {
            const startedAt = new Date(`${existing.date}T${existing.start}`);
            running = { timerId: existing.id, startedAt };

            const entry = await getEntryByTimerId(existing.id);
            if (entry) {
                selectedProject = String(entry.project_id);
            }
        }

        await refreshTodayTotal();
        syncTray();

        // handle tray actions routed via layout navigation
        const trayAction = page.url.searchParams.get("tray");
        if (trayAction) {
            await goto("/", { replaceState: true });
            if (trayAction === "stop_timer" && running) {
                handleStop(running.timerId, true);
            } else if (trayAction === "start_timer" && !running && selectedProject) {
                handleStart();
            } else if (trayAction.startsWith("select_project:")) {
                const projId = Number(trayAction.slice("select_project:".length));
                handleTrayProjectSelect(projId);
            }
        }

        listen<string>("tray-menu-action", (event) => {
            const payload = event.payload;
            if (payload === "stop_timer" && running) {
                handleStop(running.timerId, true);
            } else if (payload === "start_timer" && !running && selectedProject) {
                handleStart();
            } else if (payload.startsWith("select_project:")) {
                const projId = Number(payload.slice("select_project:".length));
                handleTrayProjectSelect(projId);
            }
        }).then((fn) => unlistenTray = fn);
    });

    onDestroy(() => {
        unlistenTray?.();
    });

    async function handleStart() {
        const timerId = await startTimer();
        running = { timerId, startedAt: new Date() };

        if (selectedProject) {
            await createEntry(timerId, Number(selectedProject));
        }

        syncTray();
    }

    async function handleStop(timerId: number, showWindow = false) {
        await stopTimer(timerId);
        running = null;
        await refreshTodayTotal();
        syncTray();
        await resizeWindow(400, 300);
        stoppedTimerId = timerId;
        if (showWindow) {
            const w = getCurrentWindow();
            await w.show();
            await w.setFocus();
        }
    }

    async function handleTrayProjectSelect(projectId: number) {
        if (running) return;
        selectedProject = String(projectId);
        await refreshTodayTotal();
        syncTray();
    }

    async function handleSummary(title: string, summary: string) {
        if (stoppedTimerId !== null) {
            await updateEntrySummary(stoppedTimerId, title, summary);
        }
        stoppedTimerId = null;
        await resizeWindow(400, 250);
    }

    async function handleSkipSummary() {
        stoppedTimerId = null;
        await resizeWindow(400, 250);
    }
</script>

<main>
    <Timer
        disabled={timerDisabled}
        bind:running={running}
        baseElapsed={todayTotal}
        onstart={handleStart}
        onstop={handleStop}
    />
    <Select
        options={projectOptions}
        bind:value={selectedProject}
        placeholder="Select Project"
        disabled={running !== null}
        onchange={async (value) => {
            selectedProject = value;
            await refreshTodayTotal();
            syncTray();
            await resizeWindow(400, 250);
        }}
        size="lg"
        onopen={async () => {
            let height =
                projectOptions.length > 4 ? 343 :
                    projectOptions.length === 4 ? 339 :
                        projectOptions.length === 3 ? 303 :
                            projectOptions.length === 2 ? 266 : 250;

            await resizeWindow(400, height);
        }}
        onclose={async () => {
            await resizeWindow(400, 250);
        }}
    />
    <Menu />

    <DialogSummary
        open={stoppedTimerId !== null}
        onsave={handleSummary}
        onskip={handleSkipSummary}
    />
</main>

<style>
</style>
