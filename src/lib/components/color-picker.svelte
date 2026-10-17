<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import { onMount, untrack } from "svelte";
    import Icon from "$lib/components/icon.svelte";
    import { Colorize } from "$lib/icons";
    import { type Hsv, hexToHsv, hsvToHex, normalizeHex } from "$lib/helpers/colors";
    import { colorSamplerSupported, sampleScreenColor } from "$lib/color-sampler";

    type Props = {
        value: string;
    };

    let { value = $bindable() }: Props = $props();

    let hsv: Hsv = $state(untrack(() => hexToHsv(normalizeHex(value) ?? "#000000")));
    let hexText: string = $state(untrack(() => value));
    let hexFocused: boolean = $state(false);
    let samplerSupported: boolean = $state(false);

    onMount(async () => {
        samplerSupported = await colorSamplerSupported();
    });

    // external writes re-seed hsv; hue and saturation survive when the hex
    // alone cannot carry them (grays, black)
    $effect(() => {
        const hex: string | null = normalizeHex(value);
        if (!hex || hex === untrack(() => hsvToHex(hsv))) return;
        const next: Hsv = hexToHsv(hex);
        untrack(() => {
            hsv = {
                h: next.s === 0 || next.v === 0 ? hsv.h : next.h,
                s: next.v === 0 ? hsv.s : next.s,
                v: next.v,
            };
        });
    });

    $effect(() => {
        const current: string = value;
        if (!untrack(() => hexFocused)) hexText = current;
    });

    function setHsv(next: Partial<Hsv>) {
        hsv = { ...hsv, ...next };
        value = hsvToHex(hsv);
    }

    function clamp01(n: number): number {
        return Math.min(1, Math.max(0, n));
    }

    function trackPointer(e: PointerEvent, apply: (x: number, y: number) => void) {
        const el = e.currentTarget as HTMLElement;
        const update = (ev: PointerEvent) => {
            const r: DOMRect = el.getBoundingClientRect();
            apply(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height));
        };
        const end = () => {
            el.removeEventListener("pointermove", update);
            el.removeEventListener("pointerup", end);
            el.removeEventListener("pointercancel", end);
        };
        el.setPointerCapture(e.pointerId);
        el.focus();
        update(e);
        el.addEventListener("pointermove", update);
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
    }

    function stepFor(e: KeyboardEvent): number {
        return e.shiftKey ? 0.1 : 0.01;
    }

    function handleAreaKey(e: KeyboardEvent) {
        const step: number = stepFor(e);
        const moves: Record<string, Partial<Hsv>> = {
            ArrowLeft: { s: clamp01(hsv.s - step) },
            ArrowRight: { s: clamp01(hsv.s + step) },
            ArrowDown: { v: clamp01(hsv.v - step) },
            ArrowUp: { v: clamp01(hsv.v + step) },
        };
        if (!(e.key in moves)) return;
        e.preventDefault();
        setHsv(moves[e.key]);
    }

    function handleHueKey(e: KeyboardEvent) {
        const step: number = e.shiftKey ? 10 : 1;
        const moves: Record<string, number> = {
            ArrowLeft: hsv.h - step,
            ArrowDown: hsv.h - step,
            ArrowRight: hsv.h + step,
            ArrowUp: hsv.h + step,
            Home: 0,
            End: 359,
        };
        if (!(e.key in moves)) return;
        e.preventDefault();
        setHsv({ h: Math.min(359, Math.max(0, moves[e.key])) });
    }

    function handleHexInput() {
        const hex: string | null = normalizeHex(hexText);
        if (hex) value = hex;
    }

    function handleHexKey(e: KeyboardEvent) {
        // enter would submit an enclosing form
        if (e.key !== "Enter") return;
        e.preventDefault();
        hexText = value;
    }

    async function sample() {
        const hex: string | null = await sampleScreenColor();
        if (hex) value = hex;
    }
</script>

<!--
    @component
    Platform-independent color picker: saturation/brightness area, hue bar,
    screen color sampler (when the platform has one) and a hex field. Always
    writes uppercase `#RRGGBB`.

    @param {string} value - Bindable hex color.
-->
<div class="picker" style:--hue={hsv.h} style:--s={hsv.s} style:--v={hsv.v} style:--color={value}>
    <div
        class="area"
        role="slider"
        tabindex="0"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext="Saturation {Math.round(hsv.s * 100)}%, brightness {Math.round(hsv.v * 100)}%"
        onpointerdown={(e: PointerEvent) => trackPointer(e, (x, y) => setHsv({ s: x, v: 1 - y }))}
        onkeydown={handleAreaKey}
    >
        <span class="area-thumb"></span>
    </div>
    <div
        class="hue"
        role="slider"
        tabindex="0"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.h)}
        onpointerdown={(e: PointerEvent) => trackPointer(e, (x) => setHsv({ h: Math.min(359, x * 360) }))}
        onkeydown={handleHueKey}
    >
        <span class="hue-thumb"></span>
    </div>
    <div class="row">
        {#if samplerSupported}
            <button type="button" class="sampler" title="Pick color from screen" aria-label="Pick color from screen" onclick={sample}>
                <Icon path={Colorize} size="16" fill="var(--gray-20)" />
            </button>
        {/if}
        <input
            type="text"
            aria-label="Hex color"
            placeholder="Hex, e.g. #9ECB78"
            maxlength="7"
            spellcheck="false"
            autocomplete="off"
            bind:value={hexText}
            oninput={handleHexInput}
            onkeydown={handleHexKey}
            onfocus={() => (hexFocused = true)}
            onblur={() => { hexFocused = false; hexText = value; }}
        />
    </div>
</div>

<style>
    .picker {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .area,
    .hue {
        position: relative;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        cursor: crosshair;
        touch-action: none;
        outline: none;
    }

    .area:focus-visible,
    .hue:focus-visible {
        border-color: var(--gray-10);
    }

    .area {
        height: 110px;
        background:
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(var(--hue) 100% 50%));
    }

    .hue {
        height: 10px;
        background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    }

    .area-thumb,
    .hue-thumb {
        position: absolute;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .area-thumb {
        left: calc(var(--s) * 100%);
        top: calc((1 - var(--v)) * 100%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--color);
    }

    .hue-thumb {
        left: calc(var(--hue) / 360 * 100%);
        top: 50%;
        width: 4px;
        height: 14px;
        border-radius: 2px;
        background-color: hsl(var(--hue) 100% 50%);
    }

    .row {
        display: flex;
        align-items: stretch;
        gap: 0.4rem;
    }

    .sampler {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 30px;
        padding: 0;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .sampler:hover,
    .sampler:focus-visible {
        border-color: var(--gray-60);
        outline: none;
    }

    input {
        flex: 1;
        width: 0;
        min-width: 0;
        padding: 6px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        box-sizing: border-box;
        color: var(--gray-10);
        font-size: 0.85rem;
        font-weight: 300;
        font-variant-numeric: tabular-nums;
        text-transform: uppercase;
        outline: none;
    }

    input::placeholder {
        color: var(--gray-40);
        text-transform: none;
    }

    input:focus {
        border-color: var(--gray-60);
    }
</style>
