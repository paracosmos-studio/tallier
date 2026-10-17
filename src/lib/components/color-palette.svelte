<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import { onMount, tick } from "svelte";
    import Button from "$lib/components/button.svelte";
    import ColorPicker from "$lib/components/color-picker.svelte";
    import Icon from "$lib/components/icon.svelte";
    import Tooltip from "$lib/components/tooltip.svelte";
    import { Add, Check, Edit } from "$lib/icons";
    import type { TooltipAnchor } from "$lib/types";
    import {
        MAX_CUSTOM_COLORS,
        getCustomColors,
        isLightColor,
        normalizeHex,
        setCustomColors,
    } from "$lib/helpers/colors";

    type Props = {
        value: string;
        presets: readonly string[];
        onselect?: (color: string) => void;
    };

    type Swatch = {
        color: string;
        custom: number | null;
    };

    let { value = $bindable(), presets, onselect }: Props = $props();

    const EDGE_GAP: number = 12;
    const HOVER_CLOSE_DELAY: number = 150;

    let customs: string[] = $state([]);
    // null: editor closed, -1: adding, otherwise the custom color being edited
    let editIndex: number | null = $state(null);
    let draft: string = $state("");
    let hovered: number | null = $state(null);
    let anchor: TooltipAnchor | null = $state(null);
    let anchorEl: HTMLButtonElement | null = null;
    let editButton: HTMLButtonElement | null = $state(null);
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let root: HTMLDivElement;
    let maxHeight: number = $state(0);
    let scrollable: boolean = $state(false);

    let current: string | null = $derived(normalizeHex(value));
    let swatches: Swatch[] = $derived([
        ...presets.map((color) => ({ color, custom: null })),
        ...customs.map((color, i) => ({ color, custom: i })),
    ]);
    let canAdd: boolean = $derived(customs.length < MAX_CUSTOM_COLORS);

    onMount(async () => {
        fitToWindow();
        customs = await getCustomColors();
    });

    // content height changes with the editor, the custom list and the cap
    $effect(() => {
        void [editIndex, customs.length, maxHeight];
        tick().then(() => {
            scrollable = root.scrollHeight > root.clientHeight;
        });
    });

    function fitToWindow() {
        maxHeight = Math.max(120, window.innerHeight - root.getBoundingClientRect().top - EDGE_GAP);
    }

    function pick(color: string) {
        value = color;
        onselect?.(color);
    }

    async function openEditor(index: number) {
        hideTooltip();
        editIndex = index;
        draft = index === -1 ? (current ?? presets[0]) : customs[index];
        await tick();
        root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
    }

    function closeEditor() {
        editIndex = null;
    }

    async function persist(next: string[]) {
        customs = [...new Set(next)].filter((c) => !presets.includes(c));
        await setCustomColors(customs);
    }

    async function add() {
        if (!presets.includes(draft) && !customs.includes(draft)) await persist([...customs, draft]);
        closeEditor();
        pick(draft);
    }

    async function save() {
        if (editIndex === null || editIndex < 0) return;
        const previous: string = customs[editIndex];
        await persist(customs.with(editIndex, draft));
        if (current === previous) value = draft;
        closeEditor();
    }

    async function remove() {
        if (editIndex === null || editIndex < 0) return;
        await persist(customs.toSpliced(editIndex, 1));
        closeEditor();
    }

    function showTooltip(index: number, el: HTMLButtonElement) {
        clearTimeout(closeTimer);
        hovered = index;
        anchorEl = el;
        const r: DOMRect = el.getBoundingClientRect();
        anchor = { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    function scheduleHide() {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(hideTooltip, HOVER_CLOSE_DELAY);
    }

    function keepTooltip() {
        clearTimeout(closeTimer);
    }

    function hideTooltip() {
        clearTimeout(closeTimer);
        hovered = null;
        anchor = null;
    }

    // the tooltip is portaled, so tab order is bridged by hand:
    // swatch -> edit -> next swatch
    function handleSwatchKey(e: KeyboardEvent, index: number) {
        if (e.key !== "Tab" || e.shiftKey || hovered !== index || !editButton) return;
        e.preventDefault();
        editButton.focus();
    }

    function handleEditKey(e: KeyboardEvent) {
        const from: HTMLButtonElement | null = anchorEl;
        if (e.key === "Escape") {
            e.preventDefault();
            hideTooltip();
            from?.focus();
            return;
        }
        if (e.key !== "Tab" || !from) return;
        const next: HTMLButtonElement | null | undefined = e.shiftKey
            ? from
            : from.closest("li")?.nextElementSibling?.querySelector("button");
        if (!next) return;
        e.preventDefault();
        hideTooltip();
        next.focus();
    }

    function customOf(swatch: Swatch, run: (index: number) => void) {
        if (swatch.custom !== null) run(swatch.custom);
    }
</script>

<svelte:window onresize={fitToWindow} />

<!--
    @component
    Color palette popover body: preset swatches followed by persisted custom
    colors and an add tile. Custom swatches expose an Edit tooltip on hover or
    focus; add and edit run through `ColorPicker`. Scrolls inside itself so it
    never runs past the bottom of the window.

    @param {string} value - Bindable selected hex color.
    @param {readonly string[]} presets - Built-in swatches, shown first.
    @param {(color: string) => void} [onselect] - Called when a swatch or a newly added color is chosen.
-->
<div class="palette" class:scrollable bind:this={root} style:--max-height="{maxHeight}px" onscroll={hideTooltip}>
    <ul class="grid" aria-label="Colors">
        {#each swatches as swatch (`${swatch.custom === null ? "p" : "c"}${swatch.color}`)}
            {@const selected = current === swatch.color}
            {@const editing = swatch.custom !== null && swatch.custom === editIndex}
            {@const shown = editing ? draft : swatch.color}
            <li>
                <button
                    type="button"
                    class="swatch"
                    class:editing
                    style:--swatch={shown}
                    aria-label={swatch.color}
                    aria-pressed={selected}
                    onclick={() => pick(swatch.color)}
                    onpointerenter={(e: PointerEvent) =>
                        customOf(swatch, (i) => showTooltip(i, e.currentTarget as HTMLButtonElement))}
                    onpointerleave={() => customOf(swatch, scheduleHide)}
                    onfocus={(e: FocusEvent) =>
                        customOf(swatch, (i) => showTooltip(i, e.currentTarget as HTMLButtonElement))}
                    onblur={() => customOf(swatch, scheduleHide)}
                    onkeydown={(e: KeyboardEvent) => customOf(swatch, (i) => handleSwatchKey(e, i))}
                >
                    {#if selected}
                        <Icon
                            path={Check}
                            size="14"
                            fill={isLightColor(shown) ? "var(--color-background)" : "#fff"}
                        />
                    {/if}
                </button>
            </li>
        {/each}
        <li>
            <button
                type="button"
                class="swatch add"
                class:active={editIndex === -1}
                title={canAdd ? "Add custom color" : `Limit of ${MAX_CUSTOM_COLORS} custom colors reached`}
                aria-label="Add custom color"
                aria-expanded={editIndex === -1}
                disabled={!canAdd}
                onclick={() => (editIndex === -1 ? closeEditor() : openEditor(-1))}
            >
                <Icon path={Add} size="14" fill="var(--gray-20)" />
            </button>
        </li>
    </ul>
    {#if editIndex !== null}
        <div class="editor">
            <ColorPicker bind:value={draft} />
            <div class="actions">
                <Button size="xs" bgColor="var(--gray-60)" fgColor="var(--gray-10)" onclick={closeEditor}>
                    Cancel
                </Button>
                {#if editIndex === -1}
                    <Button size="xs" onclick={add}>Add</Button>
                {:else}
                    <Button size="xs" bgColor="var(--red)" onclick={remove}>Delete</Button>
                    <Button size="xs" onclick={save}>Save</Button>
                {/if}
            </div>
        </div>
    {/if}
</div>

<Tooltip
    open={hovered !== null && editIndex === null}
    {anchor}
    size="sm"
    gap={6}
    interactive
    onpointerenter={keepTooltip}
    onpointerleave={scheduleHide}
>
    <button
        type="button"
        class="edit"
        bind:this={editButton}
        onclick={() => hovered !== null && openEditor(hovered)}
        onfocus={keepTooltip}
        onblur={scheduleHide}
        onkeydown={handleEditKey}
    >
        <Icon path={Edit} size="12" fill="currentColor" />
        <span>Edit</span>
    </button>
</Tooltip>

<style>
    .palette {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        width: max-content;
        max-height: var(--max-height);
        padding: 0.4rem 0 0.4rem 0.4rem;
        overflow-x: hidden;
        overflow-y: scroll;
        overscroll-behavior: contain;
        background-color: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        box-sizing: border-box;
    }

    .palette.scrollable {
        padding-right: 0.4rem;
    }

    .palette::-webkit-scrollbar {
        width: 6px;
    }

    .palette::-webkit-scrollbar-track {
        margin-block: 4px;
        background: transparent;
    }

    .palette::-webkit-scrollbar-thumb {
        background: var(--gray-50);
        border-radius: 4px;
    }

    .palette::-webkit-scrollbar-thumb:hover {
        background: var(--gray-40);
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(8, 20px);
        gap: 0.3rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .swatch {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 4px;
        padding: 0;
        background-color: var(--swatch);
        cursor: pointer;
        transition: transform 0.1s ease;
    }

    .swatch:hover {
        transform: scale(1.08);
    }

    .swatch.editing {
        box-shadow:
            inset 0 0 0 1.5px var(--gray-10),
            inset 0 0 0 2.5px var(--gray-90);
    }

    .swatch:focus-visible {
        outline: 1px solid var(--gray-10);
        outline-offset: 1px;
    }

    .swatch.add {
        border: 1px dashed var(--gray-50);
        background-color: transparent;
        box-sizing: border-box;
    }

    .swatch.add:hover,
    .swatch.add.active {
        border-color: var(--gray-30);
    }

    .swatch.add:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    .editor {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding-top: 0.4rem;
        border-top: 1px solid var(--gray-70);
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.3rem;
    }

    .edit {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0;
        border: none;
        background: none;
        color: var(--gray-10);
        font-size: 0.7rem;
        cursor: pointer;
    }

    .edit:hover,
    .edit:focus-visible {
        color: var(--yellow);
        outline: none;
    }
</style>
