<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Stepper from "$lib/components/stepper.svelte";
    import ClientSelectList from "$lib/components/client/client-select-list.svelte";
    import Table from "$lib/components/table.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import DialogGenerateInvoiceItems from "$lib/components/dialogs/dialog-generate-invoice-items.svelte";
    import type { GenerateOptions } from "$lib/components/dialogs/dialog-generate-invoice-items.svelte";
    import type { TableInit } from "$lib/components/table.svelte";
    import { Add, WandStars } from "$lib/icons";
    import { getClients, getProjects, getReportEntries } from "$lib/db";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import { buildInvoiceItems } from "$lib/helpers/invoice-items";
    import type { Client, Project } from "$lib/types";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    const EMPTY_ITEMS: TableInit = {
        columns: [
            { header: "Items", width: 2 },
            { header: "Rate", width: 1 },
            { header: "Price", width: 1 },
        ],
        rows: 2,
    };

    // template + export steps aren't built yet
    const WIP_FROM: number = 2;

    let currentStep: number = $state(0);
    let clients: Client[] = $state([]);
    let projects: Project[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let selectedClientId: number | undefined = $state(undefined);
    let generateOpen: boolean = $state(false);
    let itemsInit: TableInit = $state(EMPTY_ITEMS);
    let itemsHasData: boolean = $state(false);

    // true when at least one data row holds non-empty text
    function hasDataRow(rows: { kind?: string; cells: string[] }[]): boolean {
        return rows.some(
            (r) => (r.kind ?? "data") === "data" && r.cells.some((c) => c.trim() !== ""),
        );
    }

    // entry condition for a forward step; later steps gate on earlier ones
    function gateMet(step: number): boolean {
        if (step === 1) return selectedClientId != null;
        if (step === 2) return itemsHasData;
        return true;
    }

    // forward navigation is gated step-by-step; going back is always allowed
    function stepDisabled(i: number): boolean {
        if (i <= currentStep) return false;
        if (i >= WIP_FROM) return true;
        for (let s = currentStep + 1; s <= i; s++) {
            if (!gateMet(s)) return true;
        }
        return false;
    }

    async function handleGenerate(opts: GenerateOptions): Promise<void> {
        generateOpen = false;
        const entries = await getReportEntries(opts.start, opts.end);
        const filtered = opts.projectIds.length
            ? entries.filter((e) => opts.projectIds.includes(e.project_id))
            : entries;
        itemsInit = buildInvoiceItems(filtered, projects, parseInt(opts.roundTo), {
            cumulativeOnly: opts.cumulativeOnly,
            includeTitles: opts.includeTitles,
            includeSummaries: opts.includeSummaries,
        });
        itemsHasData = Array.isArray(itemsInit.rows) && hasDataRow(itemsInit.rows);
    }

    onMount(async () => {
        clients = await getClients();
        projects = await getProjects();
        colorMap = buildProjectColorMap(projects);
    });
</script>

<main>
    <PageNavigation previousPage="/invoice">
        {#if currentStep === 1}
            <Button size="xs" title="Auto generate invoice items" onclick={() => (generateOpen = true)}>
                <Icon path={WandStars} size="14" fill="currentColor" />
                <span>Auto Generate</span>
            </Button>
        {/if}
    </PageNavigation>
    <div class="flow">
        <Stepper
            steps={[
                { label: "1", title: "Client" },
                { label: "2", title: "Items" },
                { label: "3", title: "Template" },
                { label: "4", title: "Export" },
            ]}
            current={currentStep}
            onselect={(i) => (currentStep = i)}
            isDisabled={stepDisabled}
        />
    </div>

    <div class="step-body">
        {#if currentStep === 0}
            <div class="client-select">
                <ClientSelectList
                    {clients}
                    bind:selectedId={selectedClientId}
                    oncomplete={() => (currentStep = 1)}
                />
            </div>
            <div class="new-client">
                <Button
                    size="xs"
                    title="New Client"
                    bgColor={"var(--gray-90)"}
                    fgColor={"var(--gray-10)"}
                    onclick={() => goto("/settings?tab=clients")}
                >
                    <Icon path={Add} size="14" fill="currentColor" />
                    <span>Add Client</span>
                </Button>
            </div>
        {:else if currentStep === 1}
            {#key itemsInit}
                <Table init={itemsInit} onchange={(s) => (itemsHasData = hasDataRow(s.rows))} />
            {/key}
        {/if}
    </div>
</main>

<DialogGenerateInvoiceItems
    open={generateOpen}
    {projects}
    ongenerate={handleGenerate}
    onclose={() => (generateOpen = false)}
/>

<style>
    .flow {
        width: 75%;
        margin: 0 auto;
    }

    .step-body {
        margin: 24px 0;
    }

    .client-select {
        width: 90%;
        margin: 0 auto;
    }

    .new-client {
        display: flex;
        justify-content: center;
        margin-top: 16px;
    }
</style>
