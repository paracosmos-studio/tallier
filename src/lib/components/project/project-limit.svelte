<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Time limit grid with daily/weekly max and notify-at thresholds.

    Enforces daily <= weekly for max limits,
    and each notify value <= its respective max limit.
    Toggle rows enable/disable all inputs in that row.

    @param {boolean} maxEnabled - whether the max-limit row is active.
    @param {boolean} notifyEnabled - whether the notify row is active.
    @param {string} [maxDaily='00:00:00'] - daily max in HH:MM:SS.
    @param {string} [maxWeekly='00:00:00'] - weekly max in HH:MM:SS.
    @param {string} [notifyDaily='00:00:00'] - daily notify threshold in HH:MM:SS.
    @param {string} [notifyWeekly='00:00:00'] - weekly notify threshold in HH:MM:SS.
-->
<script lang="ts">
    import Icon from "../icon.svelte";
    import TimeInput from "../time-input.svelte";
    import { CheckboxChecked, CheckboxBlank } from "$lib/icons";

    const ZERO = '00:00:00';
    const CAP = '99:59:59';

    interface Props {
        maxEnabled: boolean;
        notifyEnabled: boolean;
        maxDaily: string;
        maxWeekly: string;
        notifyDaily: string;
        notifyWeekly: string;
    }

    let {
        maxEnabled = $bindable(true),
        notifyEnabled = $bindable(false),
        maxDaily = $bindable(ZERO),
        maxWeekly = $bindable(ZERO),
        notifyDaily = $bindable(ZERO),
        notifyWeekly = $bindable(ZERO),
    }: Props = $props();

    function toSec(v: string): number {
        const [h, m, s] = v.split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }

    // cascade: daily <= weekly (skip zeroes)
    $effect(() => { if (toSec(maxDaily) && toSec(maxWeekly) && toSec(maxDaily) > toSec(maxWeekly)) maxWeekly = maxDaily; });

    // notify <= respective max when max row is active (skip zeroes)
    $effect(() => { if (maxEnabled && toSec(maxDaily) && toSec(notifyDaily) > toSec(maxDaily)) notifyDaily = maxDaily; });
    $effect(() => { if (maxEnabled && toSec(maxWeekly) && toSec(notifyWeekly) > toSec(maxWeekly)) notifyWeekly = maxWeekly; });

    let notifyDailyMax: string = $derived(maxEnabled && toSec(maxDaily) ? maxDaily : CAP);
    let notifyWeeklyMax: string = $derived(maxEnabled && toSec(maxWeekly) ? maxWeekly : CAP);
</script>

<div class="limit-container">
    <div class="limit-header">
        <span>Daily</span>
        <span>Weekly</span>
    </div>

    <div class="limit-body">
        <div class="limit-row">
            <div class="limit-col left">
                <button type="button" role="checkbox" aria-checked={maxEnabled} onclick={() => maxEnabled = !maxEnabled}>
                    <Icon path={maxEnabled ? CheckboxChecked : CheckboxBlank} size="18" fill={'currentColor'} />
                </button>
                <span>Max timer limit</span>
            </div>
            <div class="limit-col right">
                <TimeInput name="max-limit-daily" bind:value={maxDaily} disabled={!maxEnabled} />
                <TimeInput name="max-limit-weekly" bind:value={maxWeekly} min={toSec(maxDaily) ? maxDaily : ZERO} disabled={!maxEnabled} />
            </div>
        </div>

        <div class="limit-row">
            <div class="limit-col left">
                <button type="button" role="checkbox" aria-checked={notifyEnabled} onclick={() => notifyEnabled = !notifyEnabled}>
                    <Icon path={notifyEnabled ? CheckboxChecked : CheckboxBlank} size="18" fill={'currentColor'} />
                </button>
                <span>Send notification at</span>
            </div>
            <div class="limit-col right">
                <TimeInput name="notify-limit-daily" bind:value={notifyDaily} max={notifyDailyMax} disabled={!notifyEnabled} />
                <TimeInput name="notify-limit-weekly" bind:value={notifyWeekly} max={notifyWeeklyMax} disabled={!notifyEnabled} />
            </div>
        </div>
    </div>
</div>

<style>
    .limit-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 20px;
    }

    .limit-header {
        display: flex;
        justify-content: flex-end;
        gap: 5px;
    }

    .limit-header span {
        width: 76px;
        text-align: center;
        font-size: 0.75rem;
        color: var(--gray-30);
    }

    .limit-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .limit-row {
        display: flex;
        align-items: center;
    }

    .limit-col.left {
        display: flex;
        gap: 0.3rem;
        align-items: center;
        flex: 1;
    }

    .limit-col.right {
        display: flex;
        gap: 0.5rem;
    }

    .limit-col span {
        font-size: 0.875rem;
        color: var(--gray-20);
    }

    button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--green);
    }
</style>
