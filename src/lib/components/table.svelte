<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Editable data table primitive. Defaults to a 2x2 grid (one header row, one
    data row) when instantiated with no params. Columns are resizable by dragging
    cell seams (fr-based, so the table always fills its container with no
    horizontal scroll). Rows and columns reorder via pointer-drag handles, and
    each row/column exposes a delete control on hover. Cell text is left-aligned,
    vertically centered, and wraps without widening its column.

    @param {TableInit} [init] - Declarative seed: column headers/widths plus the
        number of empty data rows. Defaults to a 2x2 grid (two empty columns, one
        header + one data row).
    @param {(state: { columns: TableColumn[]; rows: TableRow[] }) => void} [onchange] - Fires on any structural or content change; carries the live state.
-->

<script lang="ts" module>
    export type RowKind = "header" | "data";
    export interface TableColumn {
        id: number;
        width: number; // fr weight; relative, always sums to fill the container
    }
    export interface TableRow {
        id: number;
        kind: RowKind;
        cells: string[]; // parallel to columns
    }
    export interface TableInitRow {
        kind?: RowKind; // defaults to "data"
        cells: string[]; // parallel to columns
    }
    // declarative seed: a header row from `columns`, then either N empty data
    // rows (number) or explicit pre-populated rows (array)
    export interface TableInit {
        columns: { header?: string; width?: number }[];
        rows?: number | TableInitRow[];
    }
</script>

<script lang="ts">
    import { onDestroy, onMount, untrack } from "svelte";
    import Button from "./button.svelte";
    import Icon from "./icon.svelte";
    import { Add, Drag, Delete } from "$lib/icons";

    const MIN_COL_PX: number = 48;

    let nextId: number = 0;
    const uid = (): number => ++nextId;

    // two equal empty columns, one header + one data row
    const DEFAULT_INIT: TableInit = { columns: [{}, {}], rows: 1 };

    function build(init: TableInit): { columns: TableColumn[]; rows: TableRow[] } {
        const cols: TableColumn[] = init.columns.map((c) => ({
            id: uid(),
            width: c.width ?? 1,
        }));
        const header: TableRow = {
            id: uid(),
            kind: "header",
            cells: init.columns.map((c) => c.header ?? ""),
        };
        const data: TableRow[] = Array.isArray(init.rows)
            ? init.rows.map((r) => ({
                  id: uid(),
                  kind: r.kind ?? "data",
                  cells: [...r.cells],
              }))
            : Array.from({ length: init.rows ?? 0 }, () => ({
                  id: uid(),
                  kind: "data" as RowKind,
                  cells: cols.map(() => ""),
              }));
        return { columns: cols, rows: [header, ...data] };
    }

    type Props = {
        init?: TableInit;
        onchange?: (state: { columns: TableColumn[]; rows: TableRow[] }) => void;
    };

    let { init, onchange }: Props = $props();

    // working state, seeded once from `init` (or the 2x2 default)
    const seeded = untrack(() => build(init ?? DEFAULT_INIT));
    let columns: TableColumn[] = $state(seeded.columns);
    let rows: TableRow[] = $state(seeded.rows);

    const template: string = $derived(
        columns.map((c) => `minmax(0, ${c.width}fr)`).join(" "),
    );

    const hasData: boolean = $derived(
        rows.some((r) => r.kind === "data" && r.cells.some((t) => t.trim())),
    );

    let hoveredCol: number | null = $state(null);
    let handlesEl: HTMLElement;
    let bodyEl: HTMLElement;

    function notify(): void {
        onchange?.({ columns, rows });
    }

    // report the seeded state so consumers capture it without a first edit
    onMount(notify);

    // structural actions

    function addRow(): void {
        rows.push({ id: uid(), kind: "data", cells: columns.map(() => "") });
        notify();
    }

    function addColumn(): void {
        const avg = columns.reduce((s, c) => s + c.width, 0) / columns.length;
        columns.push({ id: uid(), width: avg });
        for (const row of rows) row.cells.push("");
        notify();
    }

    function addSection(): void {
        rows.push({ id: uid(), kind: "header", cells: columns.map(() => "") });
        rows.push({ id: uid(), kind: "data", cells: columns.map(() => "") });
        notify();
    }

    function deleteRow(r: number): void {
        if (rows.length <= 1) return;
        rows.splice(r, 1);
        notify();
    }

    function deleteColumn(c: number): void {
        if (columns.length <= 1) return;
        columns.splice(c, 1);
        for (const row of rows) row.cells.splice(c, 1);
        notify();
    }

    function onInput(e: Event, row: TableRow, c: number): void {
        row.cells[c] = (e.currentTarget as HTMLElement).textContent ?? "";
        notify();
    }

    // seed uncontrolled contenteditable once on creation
    function seed(node: HTMLElement, value: string) {
        if (value) node.textContent = value;
    }

    // column resize: transfer fr weight between the two columns sharing a seam

    let resize: {
        col: number;
        startX: number;
        gridW: number;
        a: number;
        b: number;
        total: number;
    } | null = null;

    function startResize(e: PointerEvent, col: number): void {
        e.preventDefault();
        e.stopPropagation();
        const total = columns.reduce((s, c) => s + c.width, 0);
        resize = {
            col,
            startX: e.clientX,
            gridW: handlesEl.clientWidth,
            a: columns[col].width,
            b: columns[col + 1].width,
            total,
        };
        document.body.style.cursor = "col-resize";
        window.addEventListener("pointermove", onResizeMove);
        window.addEventListener("pointerup", endResize);
    }

    function onResizeMove(e: PointerEvent): void {
        if (!resize) return;
        const minFr = (MIN_COL_PX / resize.gridW) * resize.total;
        const dxFr = ((e.clientX - resize.startX) / resize.gridW) * resize.total;
        let a = resize.a + dxFr;
        let b = resize.b - dxFr;
        if (a < minFr) (b -= minFr - a), (a = minFr);
        if (b < minFr) (a -= minFr - b), (b = minFr);
        columns[resize.col].width = a;
        columns[resize.col + 1].width = b;
    }

    function endResize(): void {
        if (!resize) return;
        resize = null;
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", onResizeMove);
        window.removeEventListener("pointerup", endResize);
        notify();
    }

    // pointer-based reorder (reliable in WKWebView, unlike native DnD)

    let dragRow: number | null = $state(null);
    let overRow: number | null = $state(null);
    let insertionY: number | null = $state(null);
    let dragCol: number | null = $state(null);
    let overCol: number | null = $state(null);

    function move<T>(list: T[], from: number, to: number): void {
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
    }

    // returns the index whose midpoint the pointer has passed, along `axis`
    function targetIndex(els: NodeListOf<HTMLElement>, pos: number, axis: "x" | "y"): number {
        for (let i = 0; i < els.length; i++) {
            const r = els[i].getBoundingClientRect();
            const mid = axis === "x" ? r.left + r.width / 2 : r.top + r.height / 2;
            if (pos < mid) return i;
        }
        return els.length - 1;
    }

    function rowGripDown(e: PointerEvent, r: number): void {
        e.preventDefault();
        dragRow = overRow = r;
        document.body.style.cursor = "grabbing";
        window.addEventListener("pointermove", rowMove);
        window.addEventListener("pointerup", rowUp);
    }

    function rowMove(e: PointerEvent): void {
        if (dragRow === null) return;
        const els = bodyEl.querySelectorAll<HTMLElement>(".row");
        const t = targetIndex(els, e.clientY, "y");
        overRow = t;
        if (t === dragRow) {
            insertionY = null;
            return;
        }
        // line on the leading edge in the direction of travel
        const rect = els[t].getBoundingClientRect();
        const edge = t > dragRow ? rect.bottom : rect.top;
        insertionY = edge - bodyEl.getBoundingClientRect().top;
    }

    function rowUp(): void {
        if (dragRow !== null && overRow !== null && dragRow !== overRow) {
            move(rows, dragRow, overRow);
            notify();
        }
        dragRow = overRow = insertionY = null;
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", rowMove);
        window.removeEventListener("pointerup", rowUp);
    }

    function colGripDown(e: PointerEvent, c: number): void {
        e.preventDefault();
        dragCol = overCol = c;
        document.body.style.cursor = "grabbing";
        window.addEventListener("pointermove", colMove);
        window.addEventListener("pointerup", colUp);
    }

    function colMove(e: PointerEvent): void {
        if (dragCol === null) return;
        overCol = targetIndex(handlesEl.querySelectorAll(".col-h"), e.clientX, "x");
    }

    function colUp(): void {
        if (dragCol !== null && overCol !== null && dragCol !== overCol) {
            move(columns, dragCol, overCol);
            for (const row of rows) move(row.cells, dragCol, overCol);
            notify();
        }
        dragCol = overCol = null;
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", colMove);
        window.removeEventListener("pointerup", colUp);
    }

    onDestroy(() => {
        window.removeEventListener("pointermove", onResizeMove);
        window.removeEventListener("pointerup", endResize);
        window.removeEventListener("pointermove", rowMove);
        window.removeEventListener("pointerup", rowUp);
        window.removeEventListener("pointermove", colMove);
        window.removeEventListener("pointerup", colUp);
        document.body.style.cursor = "";
    });
</script>

<div class="tbl">
    <div class="grid" role="presentation" onpointerleave={() => (hoveredCol = null)}>
        <div class="strip">
            <div class="corner left"></div>
            <div class="col-tools" bind:this={handlesEl} style:grid-template-columns={template}>
                {#each columns as col, c (col.id)}
                    <div class="col-h" class:over={overCol === c} role="presentation" onpointerenter={() => (hoveredCol = c)}>
                        <button
                            type="button"
                            class="grip"
                            class:show={hoveredCol === c}
                            title="Drag to reorder column"
                            onpointerdown={(e) => colGripDown(e, c)}
                        >
                            <Icon path={Drag} size="13" fill="currentColor" />
                        </button>
                        {#if columns.length > 1}
                            <button
                                type="button"
                                class="del"
                                class:show={hoveredCol === c}
                                title="Delete column"
                                onclick={() => deleteColumn(c)}
                            >
                                <Icon path={Delete} size="13" fill="currentColor" />
                            </button>
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="corner right"></div>
        </div>

        <div class="body" bind:this={bodyEl}>
            {#if insertionY !== null}
                <div class="insert-line" style:top="{insertionY}px" aria-hidden="true"></div>
            {/if}
            {#each rows as row, r (row.id)}
                <div class="row" class:dragging={dragRow === r}>
                    <div class="row-handle">
                        <button
                            type="button"
                            class="grip"
                            title="Drag to reorder row"
                            onpointerdown={(e) => rowGripDown(e, r)}
                        >
                            <Icon path={Drag} size="13" fill="currentColor" />
                        </button>
                    </div>
                    <div class="row-cells" style:grid-template-columns={template}>
                        {#each columns as col, c (col.id)}
                            <div class="cell {row.kind}" role="presentation" onpointerenter={() => (hoveredCol = c)}>
                                <div
                                    class="edit"
                                    role="textbox"
                                    tabindex="0"
                                    aria-multiline="true"
                                    aria-label={row.kind === "header" ? "Header cell" : "Cell"}
                                    contenteditable="true"
                                    oninput={(e) => onInput(e, row, c)}
                                    use:seed={row.cells[c]}
                                ></div>
                                {#if c < columns.length - 1}
                                    <span class="rsz" aria-hidden="true" onpointerdown={(e) => startResize(e, c)}></span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                    <div class="row-del">
                        {#if rows.length > 1}
                            <button type="button" class="del" title="Delete row" onclick={() => deleteRow(r)}>
                                <Icon path={Delete} size="13" fill="currentColor" />
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <div class="actions">
        <Button size="xs" title="Add row" bgColor="var(--gray-90)" fgColor="var(--gray-10)" onclick={addRow}>
            <Icon path={Add} size="14" fill="currentColor" />
            <span>Add Row</span>
        </Button>
        <Button size="xs" title="Add column" bgColor="var(--gray-90)" fgColor="var(--gray-10)" onclick={addColumn}>
            <Icon path={Add} size="14" fill="currentColor" />
            <span>Add Column</span>
        </Button>
        {#if hasData}
            <Button size="xs" title="Add section" bgColor="var(--gray-90)" fgColor="var(--gray-10)" onclick={addSection}>
                <Icon path={Add} size="14" fill="currentColor" />
                <span>Add Section</span>
            </Button>
        {/if}
    </div>
</div>

<style>
    .tbl {
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        font-size: 0.78rem;
    }

    .actions {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 12px;
    }

    .strip,
    .row {
        display: grid;
        grid-template-columns: 16px 1fr 18px;
        align-items: stretch;
    }

    .strip {
        height: 16px;
    }

    .corner {
        min-width: 0;
    }

    .col-tools {
        display: grid;
        min-width: 0;
        border-inline: 1px solid transparent;
    }

    .col-h {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .col-h.over {
        box-shadow: inset 2px 0 0 var(--green);
    }

    .row-handle {
        display: flex;
        align-items: center;
        justify-content: flex-start;
    }

    .row-del {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .grip,
    .del {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: none;
        border: none;
        color: var(--gray-30);
        opacity: 0;
        transition: opacity 0.15s ease, color 0.15s ease;
    }

    .grip {
        cursor: grab;
    }

    .grip:active {
        cursor: grabbing;
    }

    .del {
        cursor: pointer;
    }

    .grip:hover {
        color: var(--gray-10);
    }

    .del:hover {
        color: var(--red);
    }

    .col-h .grip.show,
    .col-h .del.show,
    .row:hover .grip,
    .row:hover .del {
        opacity: 1;
    }

    .body {
        position: relative;
    }

    .row-cells {
        display: grid;
        min-width: 0;
        border-inline: 1px solid var(--gray-70);
        border-bottom: 1px solid var(--gray-70);
    }

    .row:first-child .row-cells {
        border-top: 1px solid var(--gray-70);
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        overflow: hidden;
    }

    .row:last-child .row-cells {
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        overflow: hidden;
    }

    .row.dragging {
        opacity: 0.5;
    }

    .insert-line {
        position: absolute;
        left: 16px;
        right: 18px;
        height: 2px;
        background: var(--green);
        transform: translateY(-1px);
        pointer-events: none;
        z-index: 3;
    }

    .cell {
        position: relative;
        display: flex;
        align-items: center;
        min-height: 30px;
        padding: 4px 8px;
        box-sizing: border-box;
        border-right: 1px solid var(--gray-70);
        background: var(--color-background);
    }

    .cell:last-child {
        border-right: none;
    }

    .cell.header {
        background: var(--gray-90);
        font-weight: 500;
        color: var(--yellow);
    }

    .edit {
        flex: 1;
        min-width: 0;
        outline: none;
        line-height: 1.35;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }

    .rsz {
        position: absolute;
        top: 0;
        right: -4px;
        width: 8px;
        height: 100%;
        cursor: col-resize;
        z-index: 1;
    }

    .rsz:hover {
        background: var(--green);
        opacity: 0.4;
    }
</style>
