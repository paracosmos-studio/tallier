<!--
    @component
    Preferences panel for the Settings page. Bundles application-level toggles
    and the persistent storage location selector.
-->
<script lang="ts">
    import Toggle from "$lib/components/toggle.svelte";

    import { onMount } from "svelte";
    import { getSetting, setSetting } from "$lib/db";
    import { setTrayShowTitle, setTrayAutoPause } from "$lib/tray";

    type Settings = {
        taskbarDisplay: boolean
        autoPauseOnSleep: boolean
        sendAnonymousUsagePing: boolean
        enableAutomaticUpdates: boolean
    };

    let settings: Settings = $state({
        taskbarDisplay: false,
        autoPauseOnSleep: false,
        sendAnonymousUsagePing: false,
        enableAutomaticUpdates: true,
    });

    onMount(async () => {
        const taskbar = await getSetting("taskbarDisplay");
        if (taskbar !== null) settings.taskbarDisplay = taskbar === "true";
        const autoPause = await getSetting("autoPauseOnSleep");
        if (autoPause !== null) settings.autoPauseOnSleep = autoPause === "true";
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
</script>

<section>
    <div id="preferences">
        <div class="preference-item">
            <span>Display time on menu bar</span>
            <Toggle checked={settings.taskbarDisplay} onchange={handleTaskbarToggle} />
        </div>

        <div class="preference-item">
            <span>Send anonymous usage ping</span>
            <Toggle bind:checked={settings.sendAnonymousUsagePing} />
        </div>

        <div class="preference-item">
            <span>Enable automatic updates</span>
            <Toggle bind:checked={settings.enableAutomaticUpdates} />
        </div>

        <div class="preference-item">
            <span>Stop timer when system goes to sleep</span>
            <Toggle checked={settings.autoPauseOnSleep} onchange={handleAutoPauseToggle} />
        </div>
    </div>
</section>

<style>
    label {
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;
        font-weight: 400;
        color: var(--yellow);
        margin: 0 0 0.4rem 0;
        gap: 0.3rem;
    }

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
</style>
