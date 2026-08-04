<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Stepper from "$lib/components/stepper.svelte";
    import ClientSelectList from "$lib/components/client/client-select-list.svelte";
    import InvoiceDetails from "$lib/components/invoice/invoice-details.svelte";
    import InvoiceTemplate from "$lib/components/invoice/invoice-template.svelte";
    import Table from "$lib/components/table.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import DialogGenerateInvoiceItems from "$lib/components/dialogs/dialog-generate-invoice-items.svelte";
    import type { GenerateOptions } from "$lib/components/dialogs/dialog-generate-invoice-items.svelte";
    import DialogExport from "$lib/components/dialogs/dialog-export.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import DialogEditClient from "$lib/components/dialogs/dialog-edit-client.svelte";
    import DialogFullscreen from "$lib/components/dialogs/dialog-fullscreen.svelte";
    import InvoiceExportSuccess from "$lib/animations/invoice-export-success.svelte";
    import type { TableInit, TableColumn, TableRow } from "$lib/components/table.svelte";
    import EmptyState from "$lib/components/empty-state.svelte";
    import { Add, WandStars, WorkOutlined, Download } from "$lib/icons";
    import { getClients, getProjects, getReportEntries, updateClient } from "$lib/db";
    import { buildProjectColorMap } from "$lib/helpers/colors";
    import { buildInvoiceItems } from "$lib/helpers/invoice-items";
    import { assembleInvoice } from "$lib/helpers/invoice-data";
    import { generateInvoiceNo } from "$lib/helpers/invoice";
    import { exportInvoice, invoiceTargetPath, type InvoiceFormat } from "$lib/helpers/export-invoice";
    import { pathExists } from "$lib/helpers/fs";
    import { notify } from "$lib/helpers/notify";
    import type { Client, InvoiceData, InvoiceMeta, Profile, Project } from "$lib/types";
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";

    const EMPTY_ITEMS: TableInit = {
        columns: [
            { header: "Items", width: 2 },
            { header: "Rate", width: 1 },
            { header: "Price", width: 1 },
        ],
        rows: 2,
    };

    let currentStep: number = $state(0);
    let detailsValid: boolean = $state(false);
    let clients: Client[] = $state([]);
    let projects: Project[] = $state([]);
    let colorMap: Map<number, string> = $state(new Map());
    let selectedClientId: number | undefined = $state(undefined);
    let selectedClient: Client | undefined = $derived(
        clients.find((c) => c.id === selectedClientId),
    );
    let generateOpen: boolean = $state(false);
    let editClient: Client | undefined = $state(undefined);
    let itemsInit: TableInit = $state(EMPTY_ITEMS);
    let itemsHasData: boolean = $state(false);
    let itemsSnapshot: { columns: TableColumn[]; rows: TableRow[] } | null = $state(null);
    let invoiceMeta: InvoiceMeta | null = $state(null);
    let senderProfile: Profile | undefined = $state(undefined);

    // reseed the persisted invoice number when the recipient changes after Details was filled
    let metaClientId: number | undefined = undefined;
    $effect(() => {
        if (selectedClientId === metaClientId) return;
        metaClientId = selectedClientId;
        untrack(() => {
            if (invoiceMeta) {
                invoiceMeta = { ...invoiceMeta, invoiceNo: generateInvoiceNo(selectedClient) };
            }
        });
    });

    // assembled once Client, Items and Details are all present; feeds the Template step
    let invoiceData: InvoiceData | null = $derived(
        selectedClient && senderProfile && invoiceMeta && itemsSnapshot
            ? assembleInvoice(senderProfile, selectedClient, invoiceMeta, itemsSnapshot)
            : null,
    );

    const INVOICE_FORMATS = [
        { value: "pdf", label: "PDF" },
        { value: "html", label: "HTML" },
        { value: "csv", label: "CSV" },
        { value: "txt", label: "Text" },
    ];

    let selectedTemplate: string = $state("default");
    let exportOpen: boolean = $state(false);
    let exportError: string | null = $state(null);
    let overwriteOpen: boolean = $state(false);
    let exportBusy: boolean = $state(false);
    let pendingExport: { format: InvoiceFormat; location: string } | null = $state(null);
    let successOpen: boolean = $state(false);

    async function runInvoiceExport(format: InvoiceFormat, location: string): Promise<void> {
        if (!invoiceData) return;
        exportBusy = true;
        try {
            const path = await exportInvoice(invoiceData, selectedTemplate, format, location);
            exportOpen = false;
            overwriteOpen = false;
            pendingExport = null;
            successOpen = true;
            await notify("Invoice exported", path);
        } catch (e) {
            exportError = e instanceof Error ? e.message : String(e);
            overwriteOpen = false;
        } finally {
            exportBusy = false;
        }
    }

    async function handleExportConfirm(d: { format: string; location: string }): Promise<void> {
        if (!invoiceData) return;
        exportError = null;
        const format = d.format as InvoiceFormat;
        try {
            if (await pathExists(invoiceTargetPath(d.location, invoiceData, format))) {
                pendingExport = { format, location: d.location };
                overwriteOpen = true;
                return;
            }
            await runInvoiceExport(format, d.location);
        } catch (e) {
            exportError = e instanceof Error ? e.message : String(e);
        }
    }

    // true when at least one data row holds non-empty text
    function hasDataRow(rows: { kind?: string; cells: string[] }[]): boolean {
        return rows.some(
            (r) => (r.kind ?? "data") === "data" && r.cells.some((c) => c.trim() !== ""),
        );
    }

    function captureItems(state: { columns: TableColumn[]; rows: TableRow[] }): void {
        itemsSnapshot = state;
        itemsHasData = hasDataRow(state.rows);
    }

    // rebuild a table seed from the live snapshot so edits survive step remounts
    function snapshotToInit(s: { columns: TableColumn[]; rows: TableRow[] }): TableInit {
        const [header, ...rest] = s.rows;
        return {
            columns: s.columns.map((c, i) => ({ header: header?.cells[i] ?? "", width: c.width })),
            rows: rest.map((r) => ({ kind: r.kind, cells: [...r.cells] })),
        };
    }

    let tableInit: TableInit = $derived(itemsSnapshot ? snapshotToInit(itemsSnapshot) : itemsInit);

    // entry condition for a forward step; later steps gate on earlier ones
    function gateMet(step: number): boolean {
        if (step === 1) return selectedClientId != null;
        if (step === 2) return itemsHasData;
        if (step === 3) return detailsValid;
        return true;
    }

    // a step is complete once the gate for the step after it is met
    function stepComplete(i: number): boolean {
        return i < 3 && gateMet(i + 1);
    }

    // forward navigation is gated step-by-step; going back is always allowed
    function stepDisabled(i: number): boolean {
        if (i <= currentStep) return false;
        for (let s = currentStep + 1; s <= i; s++) {
            if (!gateMet(s)) return true;
        }
        return false;
    }

    // persists to the DB only when asked; otherwise the edit lives in the local
    // list, which selectedClient (and thus invoiceData) derives from
    async function handleClientEditSave(
        payload: Omit<Client, "id" | "position">,
        updateOriginal: boolean,
    ): Promise<void> {
        const id = editClient?.id;
        if (id == null) return;
        if (updateOriginal) {
            await updateClient(id, payload);
            clients = await getClients();
        } else {
            clients = clients.map((c) => (c.id === id ? { ...c, ...payload } : c));
        }
        editClient = undefined;
    }

    async function handleGenerate(opts: GenerateOptions): Promise<void> {
        generateOpen = false;
        const entries = await getReportEntries(opts.start, opts.end);
        const filtered = opts.projectIds.length
            ? entries.filter((e) => opts.projectIds.includes(e.project_id))
            : entries;

        itemsSnapshot = null;
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
    <PageNavigation previousPage="/">
        {#if currentStep === 1}
            <Button size="xs" title="Auto generate invoice items" onclick={() => (generateOpen = true)}>
                <Icon path={WandStars} size="14" fill="currentColor" />
                <span>Auto Generate</span>
            </Button>
        {:else if currentStep === 3}
            <Button
                size="xs"
                title="Export invoice"
                onclick={() => ((exportError = null), (exportOpen = true))}
                disabled={!invoiceData || exportBusy}
            >
                <Icon path={Download} size="14" fill="currentColor" />
                <span>Export</span>
            </Button>
        {/if}
    </PageNavigation>
    <div class="flow">
        <Stepper
            steps={[
                { label: "1", title: "Client" },
                { label: "2", title: "Items" },
                { label: "3", title: "Details" },
                { label: "4", title: "Template" },
            ]}
            current={currentStep}
            onselect={(i) => (currentStep = i)}
            isDisabled={stepDisabled}
            isComplete={stepComplete}
        />
    </div>

    <div class="step-body">
        {#if currentStep === 0}
            {#if clients.length === 0}
                <EmptyState
                    icon={WorkOutlined}
                    title="No clients yet"
                    description="Save client contacts to attach them to invoices and keep billing details in one place."
                    actionLabel="Add Client"
                    actionIcon={Add}
                    onaction={() => goto("/settings?tab=clients&view=add")}
                />
            {:else}
                <div class="client-select">
                    <ClientSelectList
                        {clients}
                        bind:selectedId={selectedClientId}
                        oncomplete={() => (currentStep = 1)}
                        onedit={(c) => (editClient = c)}
                    />
                </div>
                <div class="new-client">
                    <Button
                        size="xs"
                        title="New Client"
                        bgColor={"var(--gray-90)"}
                        fgColor={"var(--gray-10)"}
                        onclick={() => goto("/settings?tab=clients&view=add")}
                    >
                        <Icon path={Add} size="14" fill="currentColor" />
                        <span>Add Client</span>
                    </Button>
                </div>
            {/if}
        {:else if currentStep === 1}
            {#key itemsInit}
                <Table init={tableInit} onchange={captureItems} />
            {/key}
        {:else if currentStep === 2}
            <InvoiceDetails
                client={selectedClient}
                meta={invoiceMeta}
                profile={senderProfile}
                onvalidchange={(v) => (detailsValid = v)}
                onchange={(m) => (invoiceMeta = m)}
                onprofilechange={(p) => (senderProfile = p)}
            />
        {:else if currentStep === 3 && invoiceData}
            <InvoiceTemplate data={invoiceData} bind:selected={selectedTemplate} />
        {/if}
    </div>
</main>

<DialogGenerateInvoiceItems
    open={generateOpen}
    {projects}
    ongenerate={handleGenerate}
    onclose={() => (generateOpen = false)}
/>

<DialogEditClient
    open={editClient != null}
    client={editClient}
    onsave={handleClientEditSave}
    onclose={() => (editClient = undefined)}
/>

<DialogExport
    open={exportOpen}
    title="Export Invoice"
    formats={INVOICE_FORMATS}
    error={exportError}
    onexport={handleExportConfirm}
    onclose={() => (exportOpen = false)}
/>

<DialogConfirm
    open={overwriteOpen}
    title="Overwrite file?"
    message="A file with this name already exists at the destination. Overwrite it?"
    confirmLabel={exportBusy ? "Exporting…" : "Overwrite"}
    onconfirm={() => pendingExport && runInvoiceExport(pendingExport.format, pendingExport.location)}
    oncancel={() => ((overwriteOpen = false), (pendingExport = null))}
/>

<DialogFullscreen
    open={successOpen}
    showCloseIcon={false}
    autoCloseMs={5000}
    onclose={() => (successOpen = false)}
>
    <div class="export-success">
        {#if successOpen}
            <InvoiceExportSuccess size={220} />
        {/if}
        <p class="success-text">Invoice Exported!</p>
    </div>
</DialogFullscreen>

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

    .export-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .success-text {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--gray-10);
        letter-spacing: 0.01em;
        opacity: 0;
        transform: translateY(4px);
        animation: success-text-in 3.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
    }

    /* matches the check phase inside invoice-export-success */
    @keyframes success-text-in {
        0%,
        85% {
            opacity: 0;
            transform: translateY(4px);
        }
        94%,
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
