<script lang="ts">
    // import { invoke } from "@tauri-apps/api/core";
    // import { onMount } from "svelte";
    // import { initDB } from "$lib/db";
    import Select from "$lib/components/select.svelte";
    import Menu from "$lib/components/menu.svelte";
    import Timer from "$lib/components/timer.svelte";
    import { setCurrentWindowSize } from "$lib/window";
    import { onMount } from "svelte";

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
    onMount(async () => {
        await setCurrentWindowSize(400, 250);
    });
</script>

<main>
    <Timer />
    <Select
        options={[
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" },
            { value: "option3", label: "Option 3" },
            { value: "option4", label: "Option 4" },
            { value: "option5", label: "Option 5" },
            { value: "option6", label: "Option 6" },
            { value: "option7", label: "Option 7" }
        ]}
        bind:value={name}
        placeholder="Select Project"
        onchange={async (value) => {
            name = value;
            await setCurrentWindowSize(400, 250);
        }}
        onopen={async () => await setCurrentWindowSize(400, 345)}
        onclose={async () => {
            await setCurrentWindowSize(400, 250);
        }}
    />
    <Menu />
</main>

<style>
</style>
