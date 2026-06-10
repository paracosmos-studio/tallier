<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Stepper from "$lib/components/stepper.svelte";
    import ClientSelectList from "$lib/components/client/client-select-list.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Add } from "$lib/icons";
    import { getClients, getProjects } from "$lib/db";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import type { Client, Project } from "$lib/types";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    let currentStep: number = $state(0);
    let clients: Client[] = $state([]);
    let projects: Project[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let selectedClientId: number | undefined = $state(undefined);

    onMount(async () => {
        clients = await getClients();
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
    });
</script>

<main>
    <PageNavigation previousPage="/invoice" />
    <div class="flow">
        <Stepper
            steps={[
                { label: "1", title: "Client" },
                { label: "2", title: "Items" },
                { label: "3", title: "Review" },
                { label: "4", title: "Export" },
            ]}
            current={currentStep}
            onselect={(i) => (currentStep = i)}
        />
    </div>

    <div class="step-body">
        {#if currentStep === 0}
            <ClientSelectList {clients} bind:selectedId={selectedClientId} />
            <div class="new-client">
                <Button
                    size="sm"
                    title="New Client"
                    bgColor={"var(--gray-90)"}
                    fgColor={"var(--green)"}
                    onclick={() => goto("/settings?tab=clients")}
                >
                    <Icon path={Add} size="14" fill="currentColor" />
                    <span>Add New Client</span>
                </Button>
            </div>
        {/if}
    </div>
</main>

<style>
    .flow {
        width: 75%;
        margin: 0 auto;
    }

    .step-body {
        margin-top: 24px;
    }

    .new-client {
        display: flex;
        justify-content: center;
        margin-top: 16px;
    }
</style>
