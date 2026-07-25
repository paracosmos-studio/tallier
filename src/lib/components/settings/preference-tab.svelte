<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Preferences panel for the Settings page. Bundles application-level toggles
    and the persistent storage location selector.
-->
<script lang="ts">
    import Toggle from "$lib/components/toggle.svelte";
    import Select from "$lib/components/select.svelte";

    import { onMount } from "svelte";
    import { getSetting, setSetting } from "$lib/db";
    import { setTrayShowTitle, setTrayAutoPause } from "$lib/tray";
    import { updaterAvailable, AUTO_UPDATE_SETTING_KEY } from "$lib/updater.svelte";
    import { WEEK_START_SETTING_KEY, DEFAULT_WEEK_START, parseWeekStartsOn } from "$lib/helpers/date-utils";

    type Settings = {
        taskbarDisplay: boolean
        autoPauseOnSleep: boolean
        sendAnonymousUsagePing: boolean
        autoUpdate: boolean
        weekStartsOn: string
    };

    let settings: Settings = $state({
        taskbarDisplay: false,
        autoPauseOnSleep: false,
        sendAnonymousUsagePing: false,
        autoUpdate: true,
        weekStartsOn: String(DEFAULT_WEEK_START),
    });

    // false in the App Store build, which hides the auto-update toggle
    let updaterSupported: boolean = $state(false);

    const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekStartOptions = FULL_DAYS.map((name, i) => ({ value: String(i), label: name }));

    const trayTimeLabel: string = navigator.userAgent.includes("Windows")
        ? "Display time in system tray"
        : "Display time on menu bar";

    onMount(async () => {
        const taskbar = await getSetting("taskbarDisplay");
        if (taskbar !== null) settings.taskbarDisplay = taskbar === "true";
        const autoPause = await getSetting("autoPauseOnSleep");
        if (autoPause !== null) settings.autoPauseOnSleep = autoPause === "true";
        const autoUpdate = await getSetting(AUTO_UPDATE_SETTING_KEY);
        if (autoUpdate !== null) settings.autoUpdate = autoUpdate === "true";
        settings.weekStartsOn = String(parseWeekStartsOn(await getSetting(WEEK_START_SETTING_KEY)));
        updaterSupported = await updaterAvailable();
    });

    async function handleTaskbarToggle(checked: boolean) {
        settings.taskbarDisplay = checked;
        await setSetting("taskbarDisplay", String(checked));
        await setTrayShowTitle(checked);
    }

    async function handleAutoPauseToggle(checked: boolean) {
        settings.autoPauseOnSleep = checked;
        await setSetting("autoPauseOnSleep", String(checked));
        await setTrayAutoPause(checked);
    }

    async function handleAutoUpdateToggle(checked: boolean) {
        settings.autoUpdate = checked;
        await setSetting(AUTO_UPDATE_SETTING_KEY, String(checked));
    }

    async function handleWeekStartChange(value: string) {
        settings.weekStartsOn = value;
        await setSetting(WEEK_START_SETTING_KEY, value);
    }
</script>

<section>
    <div id="preferences">
        <div class="preference-item">
            <span>{trayTimeLabel}</span>
            <Toggle checked={settings.taskbarDisplay} onchange={handleTaskbarToggle} />
        </div>

        <div class="preference-item">
            <span>Send anonymous usage ping</span>
            <Toggle bind:checked={settings.sendAnonymousUsagePing} />
        </div>

        {#if updaterSupported}
            <div class="preference-item">
                <span>Enable automatic updates</span>
                <Toggle checked={settings.autoUpdate} onchange={handleAutoUpdateToggle} />
            </div>
        {/if}

        <div class="preference-item">
            <span>Stop timer when system goes to sleep</span>
            <Toggle checked={settings.autoPauseOnSleep} onchange={handleAutoPauseToggle} />
        </div>

        <div class="preference-item">
            <span>Week starts on</span>
            <div class="dropdown">
                <Select
                    options={weekStartOptions}
                    bind:value={settings.weekStartsOn}
                    size="sm"
                    searchable={false}
                    onchange={handleWeekStartChange}
                />
            </div>
        </div>
    </div>
</section>

<style>
    #preferences {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .preference-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.9rem;
        color: var(--gray-20);
    }

    .preference-item .dropdown {
        width: 150px;
    }
</style>
