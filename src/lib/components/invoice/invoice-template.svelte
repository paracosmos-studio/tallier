<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
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
        { id: "studio", name: "Studio" },
        { id: "slate", name: "Slate" },
        { id: "terminal", name: "Terminal" },
        { id: "compact", name: "Compact" },
        { id: "soft", name: "Soft" },
    ] as const;

    let svgs: Record<string, string[]> = $state({});
    let done: number = $state(0);
    let renderError: string | null = $state(null);
    let percent: number = $derived(Math.round((done / TEMPLATES.length) * 100));
    let rendering: boolean = $derived(done < TEMPLATES.length);

    const svgSrc = (svg: string): string =>
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    onMount(() => {
        for (const t of TEMPLATES) {
            invoke<string[]>("render_invoice_svg", {
                templateId: t.id,
                data: toInvoiceInput(data),
                senderLogo: data.sender.logo,
                recipientAvatar: data.recipient.avatar,
            })
                .then((pages) => {
                    svgs = { ...svgs, [t.id]: pages };
                })
                .catch((e) => {
                    renderError ??= e instanceof Error ? e.message : String(e);
                })
                .finally(() => {
                    done += 1;
                });
        }
    });
</script>

<div class="template-step">
    <nav class="tpl-nav" aria-label="Invoice templates">
        {#each TEMPLATES as t (t.id)}
            <Button
                size="xs"
                title={t.name}
                aria-pressed={selected === t.id}
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
        {/if}
        {#if rendering && !svgs[selected]}
            <div
                class="progress"
                role="progressbar"
                aria-label="Rendering template previews"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={percent}
            >
                <div class="track">
                    <div class="fill" style:width="{percent}%"></div>
                </div>
                <span class="percent">{percent}%</span>
            </div>
        {/if}
        {#if svgs[selected]?.length}
            {#each svgs[selected] as page, i (i)}
                <img src={svgSrc(page)} alt="Invoice preview page {i + 1}" />
            {/each}
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
        max-height: 60vh;
        overflow-y: auto;
    }

    .tpl-nav :global(button) {
        width: 100%;
        transform: translateZ(0);
    }

    .preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        max-height: 60vh;
        overflow: auto;
        border-radius: 5px;
    }

    .preview img {
        display: block;
        width: 100%;
        height: auto;
    }

    .error {
        margin: 2rem 0;
        font-size: 0.85rem;
        color: var(--red);
    }

    .progress {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        margin: 2rem 0;
    }

    .progress .track {
        flex: 1;
        height: 6px;
        border-radius: 999px;
        background: var(--gray-90);
        overflow: hidden;
    }

    .progress .fill {
        height: 100%;
        border-radius: 999px;
        background: var(--green);
        transition: width 180ms ease;
    }

    .progress .percent {
        min-width: 2.6em;
        text-align: right;
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
        color: var(--gray-40);
    }
</style>
