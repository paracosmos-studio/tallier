<script lang="ts">
    import { onMount } from "svelte";
    import { getProjects, startTimer, stopTimer, createEntry, getEntryByTimerId, getRunningTimer, getTodayProjectTotal } from "$lib/db";
    import Select from "$lib/components/select.svelte";
    import Menu from "$lib/components/menu.svelte";
    import Timer from "$lib/components/timer.svelte";
    import { resizeWindow } from "$lib/window";
    import type { Project } from "$lib/types";

    let selectedProject = $state("");
    let projects: Project[] = $state([]);
    let projectOptions = $derived(
        projects.map(p => ({ value: String(p.id), label: p.name }))
    );
    let timerDisabled = $derived(selectedProject === "");

    let running: { timerId: number; startedAt: Date } | null = $state(null);
    let todayTotal = $state(0);

    async function refreshTodayTotal() {
        if (selectedProject) {
            todayTotal = await getTodayProjectTotal(Number(selectedProject));
        } else {
            todayTotal = 0;
        }
    }

    onMount(async () => {
        projects = await getProjects();

        // restore a running timer if the app was restarted
        const existing = await getRunningTimer();

        if (existing && existing.id !== undefined) {
            const startedAt = new Date(`${existing.date}T${existing.start}`);
            running = { timerId: existing.id, startedAt };

            // restore the associated project selection
            const entry = await getEntryByTimerId(existing.id);
            if (entry) {
                selectedProject = String(entry.project_id);
            }
        }

        await refreshTodayTotal();
    });

    async function handleStart() {
        const timerId = await startTimer();
        running = { timerId, startedAt: new Date() };

        // create entry immediately so project association
        // persists across restarts
        if (selectedProject) {
            await createEntry(timerId, Number(selectedProject));
        }
    }

    async function handleStop(timerId: number) {
        await stopTimer(timerId);
        running = null;
        await refreshTodayTotal();
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
</main>

<style>
</style>
