<script lang="ts">
    // import { invoke } from "@tauri-apps/api/core";
    // import { onMount } from "svelte";
    // import { initDB } from "$lib/db";
    import Select from "$lib/components/select.svelte";
    import Menu from "$lib/components/menu.svelte";
    import Timer from "$lib/components/timer.svelte";
    import { resizeWindow } from "$lib/window";

    let name = $state("");
    // let greetMsg = $state("");
    // let dbInitialized = $state(false);
    // let dbError = $state<string | null>(null);

    // onMount(async () => {
    //   try {
    //     await initDB();
    //     dbInitialized = true;
    //   } catch (error) {
    //     dbError = error instanceof Error ? error.message : String(error);
    //   }
    // });

    // async function greet(event: Event) {
    //   event.preventDefault();
    //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    //   greetMsg = await invoke("greet", { name });
    // }
</script>

<main>
    <Timer />
    <Select
        options={[
            { value: "work", label: "Work" },
            { value: "hobby", label: "Hobby" },
            { value: "study", label: "Study" },
            { value: "other", label: "Other" },
        ]}
        bind:value={name}
        placeholder="Select Project"
        onchange={async (value) => {
            name = value;
            await resizeWindow(400, 250);
        }}
        size="lg"
        onopen={async () => await resizeWindow(400, 345)}
        onclose={async () => {
            await resizeWindow(400, 250);
        }}
    />
    <Menu />
</main>

<style>
</style>
