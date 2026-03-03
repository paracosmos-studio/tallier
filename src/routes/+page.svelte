<script lang="ts">
    import { onMount } from "svelte";
    import { getProjects } from "$lib/db";
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

    onMount(async () => {
        projects = await getProjects();
    });
</script>

<main>
    <Timer />
    <Select
        options={projectOptions}
        bind:value={selectedProject}
        placeholder="Select Project"
        onchange={async (value) => {
            selectedProject = value;
            await resizeWindow(400, 250);
        }}
        size="lg"
        onopen={async () => {
            let height = 
                projectOptions.length >= 4 ? 345 :
                    projectOptions.length === 3 ? 300 :
                        projectOptions.length === 2 ? 265 : 250;

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
