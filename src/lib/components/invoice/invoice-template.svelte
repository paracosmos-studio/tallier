<!--
    @component
    "Template" step of invoice creation. Renders the assembled invoice through
    each Typst template to a live SVG. A left column of template buttons selects
    which one to show in the large preview on the right (true WYSIWYG, no static
    art). Export is driven by the page via the `PageNavigation` action.

    @param {InvoiceData} data - The invoice model assembled on entering the step.
    @param {string} [selected="default"] - Bindable id of the previewed template.
-->
<script lang="ts">
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import Button from "$lib/components/button.svelte";
    import { toInvoiceInput } from "$lib/helpers/invoice-data";
    import type { InvoiceData } from "$lib/types";

    type Props = { data: InvoiceData; selected?: string };

    let { data, selected = $bindable("default") }: Props = $props();

    const TEMPLATES = [
        { id: "default", name: "Default" },
        { id: "classic", name: "Classic" },
        { id: "modern", name: "Modern" },
        { id: "minimal", name: "Minimal" },
    ] as const;

    let svgs: Record<string, string> = $state({});
    let rendering: boolean = $state(true);
    let renderError: string | null = $state(null);

    const svgSrc = (svg: string): string =>
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    onMount(async () => {
        try {
            const rendered = await Promise.all(
                TEMPLATES.map((t) =>
                    invoke<string>("render_invoice_svg", {
                        templateId: t.id,
                        data: toInvoiceInput(data),
                        senderLogo: data.sender.logo,
                        recipientAvatar: data.recipient.avatar,
                    }).then((svg) => [t.id, svg] as const),
                ),
            );
            svgs = Object.fromEntries(rendered);
        } catch (e) {
            renderError = e instanceof Error ? e.message : String(e);
        } finally {
            rendering = false;
        }
    });
</script>

<div class="template-step">
    <nav class="tpl-nav" aria-label="Invoice templates">
        {#each TEMPLATES as t (t.id)}
            <Button
                size="xs"
                title={t.name}
                bgColor={selected === t.id ? "var(--green)" : "var(--gray-90)"}
                fgColor={selected === t.id ? "var(--color-background)" : "var(--gray-10)"}
                onclick={() => (selected = t.id)}
            >
                <span>{t.name}</span>
            </Button>
        {/each}
    </nav>

    <div class="preview">
        {#if renderError}
            <p class="error" role="alert">{renderError}</p>
        {:else if rendering}
            <p class="loading">Rendering preview…</p>
        {:else if svgs[selected]}
            <img src={svgSrc(svgs[selected])} alt="Selected invoice preview" />
        {/if}
    </div>
</div>

<style>
    .template-step {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        align-items: start;
        max-width: 90%;
        margin: 0 auto;
    }

    .tpl-nav {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .tpl-nav :global(button) {
        width: 100%;
    }

    .preview {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        min-width: 0;
        max-height: 60vh;
        overflow: auto;
    }

    .preview img {
        width: 100%;
        height: auto;
    }

    .loading,
    .error {
        margin: 2rem 0;
        font-size: 0.85rem;
    }

    .error {
        color: var(--red);
    }

    .loading {
        color: var(--gray-40);
    }
</style>
