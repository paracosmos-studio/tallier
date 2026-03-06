<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { listen } from "@tauri-apps/api/event";
    import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
    import { invoke } from "@tauri-apps/api/core";
    import { getProjects, startTimer, stopTimer, createEntry, updateEntrySummary, getEntryByTimerId, getRunningTimer, getTodayProjectTotal, getWeekProjectTotal, getSetting } from "$lib/db";
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
    let limitReached = $derived.by(() => {
        const proj = getSelectedProject();
        if (!proj || !proj.max_daily_enabled) return false;
        if (proj.max_daily && proj.max_daily > 0 && todayTotal >= proj.max_daily) return true;
        if (proj.max_weekly && proj.max_weekly > 0 && weekTotal >= proj.max_weekly) return true;
        return false;
    });
    let timerDisabled = $derived(selectedProject === "" || limitReached);

    let running: { timerId: number; startedAt: Date } | null = $state(null);
    let todayTotal = $state(0);
    let weekTotal = $state(0);
    let stoppedTimerId: number | null = $state(null);
    let showTrayTitle: boolean = $state(false);
    let unlistenTray: (() => void) | undefined;
    let limitCheckId: ReturnType<typeof setInterval> | null = null;
    let dailyAlertSent: boolean = $state(false);
    let weeklyAlertSent: boolean = $state(false);

    function getSelectedProject(): Project | undefined {
        if (!selectedProject) return undefined;
        return projects.find(p => p.id === Number(selectedProject));
    }

    // compute the effective max seconds (lowest applicable daily/weekly cap minus base)
    function getEffectiveMaxSeconds(): number | undefined {
        const proj = getSelectedProject();
        if (!proj || !proj.max_daily_enabled) return undefined;

        let cap: number | undefined;
        if (proj.max_daily && proj.max_daily > 0) {
            const remaining = proj.max_daily - todayTotal;
            if (remaining > 0) cap = remaining;
            else cap = 0;
        }
        if (proj.max_weekly && proj.max_weekly > 0) {
            const remaining = proj.max_weekly - weekTotal;
            if (remaining > 0) {
                cap = cap !== undefined ? Math.min(cap, remaining) : remaining;
            } else {
                cap = 0;
            }
        }
        return cap !== undefined ? todayTotal + cap : undefined;
    }

    function getTrayProjects(): TrayProject[] {
        return trayOrder
            .map(id => projects.find(p => p.id === id))
            .filter((p): p is Project => p != null)
            .map(p => ({ id: p.id!, name: p.name }));
    }

    function syncTray() {
        const tp = getTrayProjects();
        const selId = selectedProject ? Number(selectedProject) : undefined;
        const maxSec = getEffectiveMaxSeconds();
        if (running) {
            setTrayTimer(todayTotal, running.startedAt.getTime(), tp, selId, showTrayTitle, maxSec, limitReached).catch(() => {});
        } else {
            setTrayTimer(todayTotal, undefined, tp, selId, showTrayTitle, undefined, limitReached).catch(() => {});
        }
    }

    async function refreshTodayTotal() {
        if (selectedProject) {
            todayTotal = await getTodayProjectTotal(Number(selectedProject));
        } else {
            todayTotal = 0;
        }
    }

    async function refreshWeekTotal() {
        if (selectedProject) {
            weekTotal = await getWeekProjectTotal(Number(selectedProject));
        } else {
            weekTotal = 0;
        }
    }

    async function notify(title: string, body: string) {
        let granted = await isPermissionGranted();
        if (!granted) {
            const perm = await requestPermission();
            granted = perm === "granted";
        }
        if (granted) {
            await invoke("plugin:notification|notify", { options: { title, body } });
        }
    }

    function startLimitChecking() {
        stopLimitChecking();
        dailyAlertSent = false;
        weeklyAlertSent = false;

        limitCheckId = setInterval(() => {
            if (!running || !selectedProject) return;

            const proj = getSelectedProject();
            if (!proj) return;

            const liveElapsed = Math.floor((Date.now() - running.startedAt.getTime()) / 1000);
            const currentDaily = todayTotal + liveElapsed;
            const currentWeekly = weekTotal + liveElapsed;

            // notification alerts
            if (proj.max_weekly_enabled) {
                if (!dailyAlertSent && proj.max_daily_alert && proj.max_daily_alert > 0 && currentDaily >= proj.max_daily_alert) {
                    dailyAlertSent = true;
                    notify("Daily Limit Alert", `${proj.name}: approaching daily time limit`);
                }
                if (!weeklyAlertSent && proj.max_weekly_alert && proj.max_weekly_alert > 0 && currentWeekly >= proj.max_weekly_alert) {
                    weeklyAlertSent = true;
                    notify("Weekly Limit Alert", `${proj.name}: approaching weekly time limit`);
                }
            }

            // auto-stop at max limits
            if (proj.max_daily_enabled) {
                let shouldStop = false;
                if (proj.max_daily && proj.max_daily > 0 && currentDaily >= proj.max_daily) {
                    shouldStop = true;
                }
                if (proj.max_weekly && proj.max_weekly > 0 && currentWeekly >= proj.max_weekly) {
                    shouldStop = true;
                }
                if (shouldStop && running) {
                    handleStop(running.timerId, true);
                    notify("Timer Stopped", `${proj.name}: time limit reached`);
                }
            }
        }, 1000);
    }

    function stopLimitChecking() {
        if (limitCheckId !== null) {
            clearInterval(limitCheckId);
            limitCheckId = null;
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
        await refreshWeekTotal();
        syncTray();

        if (running) {
            startLimitChecking();
        }

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
            } else if (payload === "limit_reached" && running) {
                handleStop(running.timerId, true);
                const proj = getSelectedProject();
                if (proj) notify("Timer Stopped", `${proj.name}: time limit reached`);
            } else if (payload.startsWith("select_project:")) {
                const projId = Number(payload.slice("select_project:".length));
                handleTrayProjectSelect(projId);
            }
        }).then((fn) => unlistenTray = fn);
    });

    onDestroy(() => {
        unlistenTray?.();
        stopLimitChecking();
    });

    async function handleStart() {
        await refreshWeekTotal();
        const proj = getSelectedProject();

        // prevent start if limit already reached
        if (proj?.max_daily_enabled) {
            if (proj.max_daily && proj.max_daily > 0 && todayTotal >= proj.max_daily) {
                notify("Cannot Start", `${proj.name}: daily time limit already reached`);
                return;
            }
            if (proj.max_weekly && proj.max_weekly > 0 && weekTotal >= proj.max_weekly) {
                notify("Cannot Start", `${proj.name}: weekly time limit already reached`);
                return;
            }
        }

        const timerId = await startTimer();
        running = { timerId, startedAt: new Date() };

        if (selectedProject) {
            await createEntry(timerId, Number(selectedProject));
        }

        startLimitChecking();
        syncTray();
    }

    async function handleStop(timerId: number, showWindow = false) {
        await stopTimer(timerId);
        running = null;
        stopLimitChecking();
        await refreshTodayTotal();
        await refreshWeekTotal();
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
        await refreshWeekTotal();
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
            await refreshWeekTotal();
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
