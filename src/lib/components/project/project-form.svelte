<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import { untrack } from "svelte";
    import type { Project, ProjectLimits } from "$lib/types";
    import { PROJECT_COLORS, getRandomProjectColor } from "$lib/helpers/colors";
    import { CURRENCIES } from "$lib/helpers/currency";
    import Select from "$lib/components/select.svelte";
    import ProjectLimit from "./project-limit.svelte";

    export interface ProjectFormExtras {
        color: string;
        hourlyRate: number | null;
        currency: string | null;
    }

    type Props = {
        project?: Project;
        name: string;
        currentColor?: string;
        onsave: (name: string, limits: ProjectLimits, extras: ProjectFormExtras) => void;
        oncancel: () => void;
    };

    let { project, name = $bindable(""), currentColor, onsave, oncancel }: Props = $props();

    let isEdit: boolean = $derived(!!project);
    let color: string = $state(untrack(() =>
        project ? (project.color ?? currentColor ?? getRandomProjectColor())
                : getRandomProjectColor()
    ));
    let pickerOpen: boolean = $state(false);
    let hourlyRate: string = $state(untrack(() =>
        project?.hourly_rate != null ? String(project.hourly_rate) : ""
    ));
    let currency: string = $state(untrack(() => project?.currency ?? ""));

    const currencyOptions = CURRENCIES.map(c => ({
        value: c.value,
        label: `${c.value} (${c.symbol})`,
    }));

    function secToHms(s: number | null): string {
        if (!s) return '00:00:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function hmsToSec(v: string): number | null {
        const [h, m, s] = v.split(':').map(Number);
        const total = h * 3600 + m * 60 + s;
        return total || null;
    }

    let maxEnabled: boolean = $state(untrack(() => project?.max_daily_enabled ?? false));
    let notifyEnabled: boolean = $state(untrack(() => project?.max_weekly_enabled ?? false));
    let maxDaily: string = $state(untrack(() => secToHms(project?.max_daily ?? null)));
    let maxWeekly: string = $state(untrack(() => secToHms(project?.max_weekly ?? null)));
    let notifyDaily: string = $state(untrack(() => secToHms(project?.max_daily_alert ?? null)));
    let notifyWeekly: string = $state(untrack(() => secToHms(project?.max_weekly_alert ?? null)));

    function buildLimits(): ProjectLimits {
        return {
            maxDaily: maxEnabled ? hmsToSec(maxDaily) : null,
            maxDailyAlert: notifyEnabled ? hmsToSec(notifyDaily) : null,
            maxWeekly: maxEnabled ? hmsToSec(maxWeekly) : null,
            maxWeeklyAlert: notifyEnabled ? hmsToSec(notifyWeekly) : null,
            maxDailyEnabled: maxEnabled,
            maxWeeklyEnabled: notifyEnabled,
        };
    }

    function parseRate(v: string): number | null {
        const trimmed = v.trim();
        if (!trimmed) return null;
        const n = parseFloat(trimmed);
        return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const rate = parseRate(hourlyRate);
        onsave(trimmed, buildLimits(), {
            color,
            hourlyRate: rate,
            currency: rate != null ? (currency || null) : null,
        });
    }
</script>

<!--
    @component
    Form for adding or editing a project with optional timer limits.

    @param {Project} [project] - Project to edit. Omit for add mode.
    @param {string} name - Bindable project name.
    @param {(name: string, limits: ProjectLimits) => void} onsave - Callback with name and limits on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<section>
    <p class="title">{isEdit ? "Edit" : "New"} Project</p>
    <form id="project-form" onsubmit={handleSubmit}>
        <div class="name-row">
            <button
                type="button"
                class="color-trigger"
                title="Project color"
                style="background-color: {color};"
                aria-label="Pick project color"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                onclick={() => (pickerOpen = !pickerOpen)}
            ></button>
            <input
                type="text"
                name="pr-name"
                placeholder="title"
                maxlength="30"
                bind:value={name}
                onkeydown={(e: KeyboardEvent) => {
                    if (e.key === "Escape") oncancel();
                }}
            />
            {#if pickerOpen}
                <ul class="swatches" role="listbox" aria-label="Color presets">
                    {#each PROJECT_COLORS as preset (preset)}
                        <li>
                            <button
                                type="button"
                                class="swatch"
                                class:selected={color === preset}
                                style="background-color: {preset};"
                                aria-label={preset}
                                aria-selected={color === preset}
                                role="option"
                                onclick={() => { color = preset; pickerOpen = false; }}
                            ></button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
        <ProjectLimit
            bind:maxEnabled
            bind:notifyEnabled
            bind:maxDaily
            bind:maxWeekly
            bind:notifyDaily
            bind:notifyWeekly
        />
        <div class="rate-row">
            <label for="rate-currency">Hourly rate</label>

            <div class="rate-form">
                <input
                    id="rate-currency"
                    type="text"
                    inputmode="decimal"
                    name="pr-rate"
                    placeholder="0.00"
                    bind:value={hourlyRate}
                    oninput={(e: Event) => {
                        const el = e.currentTarget as HTMLInputElement;
                        // keep digits and at most one decimal point
                        let cleaned = el.value.replace(/[^0-9.]/g, "");
                        const firstDot = cleaned.indexOf(".");
                        if (firstDot !== -1) {
                            cleaned = cleaned.slice(0, firstDot + 1)
                                + cleaned.slice(firstDot + 1).replace(/\./g, "");
                        }
                        if (cleaned !== el.value) el.value = cleaned;
                        hourlyRate = cleaned;
                    }}
                />
                <div class="currency">
                    <Select
                        options={currencyOptions}
                        bind:value={currency}
                        placeholder="Currency"
                        size="md"
                        nullable
                    />
                </div>
            </div>
        </div>
    </form>
</section>

<style>
    p {
        font-size: 16px;
        font-weight: 500;
        color: var(--gray-10);
        margin-bottom: 5px;
    }

    p.title {
        font-size: 0.875rem;
        color: var(--yellow);
        margin-top: 0;
        margin-bottom: 0.75rem;
    }

    form input {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        box-sizing: border-box;
        color: var(--gray-10);
        font-size: 0.9rem;
        font-weight: 300;
        outline: none;
    }

    form input::placeholder {
        color: var(--gray-40);
    }

    form input:focus {
        border-color: var(--gray-60);
    }

    .name-row {
        position: relative;
        display: flex;
        align-items: stretch;
        gap: 0.4rem;
    }

    .name-row input {
        flex: 1;
    }

    .color-trigger {
        width: 30px;
        height: auto;
        min-height: 28px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        transition: filter 0.15s ease;
    }

    .color-trigger:hover {
        filter: brightness(1.15);
    }

    .swatches {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 5;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 0.3rem;
        margin: 0;
        padding: 0.4rem;
        list-style: none;
        background-color: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 4px;
    }

    .swatch {
        width: 20px;
        height: 20px;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        transition: transform 0.1s ease, border-color 0.1s ease;
    }

    .swatch:hover {
        transform: scale(1.08);
    }

    .swatch.selected {
        border-color: var(--gray-10);
    }

    .rate-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
        margin-top: 2rem;
    }

    .rate-row label {
        color: var(--gray-30);
        font-weight: 300;
        font-size: 0.9rem;
        flex-shrink: 0;
    }

    .rate-form {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
    }

    .rate-form input {
        width: 80px;
    }

    .rate-form .currency {
        width: 150px;
        flex-shrink: 0;
    }
</style>
