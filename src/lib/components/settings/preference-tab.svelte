<!--
    @component
    Preferences panel for the Settings page. Bundles application-level toggles
    and the persistent storage location selector.
-->
<script lang="ts">
    import Select from "$lib/components/select.svelte";
    import Toggle from "$lib/components/toggle.svelte";

    import { onMount } from "svelte";
    import { getSetting, setSetting } from "$lib/db";
    import { setTrayShowTitle } from "$lib/tray";

    type Settings = {
        taskbarDisplay: boolean
        autoPauseOption: string
        sendAnonymousUsagePing: boolean
        enableAutomaticUpdates: boolean
    };

    let settings: Settings = $state({
        taskbarDisplay: false,
        autoPauseOption: "inactive-30",
        sendAnonymousUsagePing: false,
        enableAutomaticUpdates: true,
    });

    onMount(async () => {
        const stored = await getSetting("taskbarDisplay");
        if (stored !== null) settings.taskbarDisplay = stored === "true";
    });

    async function handleTaskbarToggle(checked: boolean) {
        settings.taskbarDisplay = checked;
        await setSetting("taskbarDisplay", String(checked));
        await setTrayShowTitle(checked);
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
            <span>Stop timer when asleep for</span>
            <div class="dropdown">
                <Select
                    options={[
                        { value: "none", label: "never" },
                        { value: "inactive-30", label: "30 sec" },
                        { value: "inactive-60", label: "1 min" },
                        { value: "inactive-300", label: "5 min" },
                    ]}
                    bind:value={settings.autoPauseOption}
                    placeholder="Select Option"
                    size="sm"
                    searchable={false}
                    onchange={async (value) => {
                        console.log("Selected option:", value);
                    }}
                />
            </div>
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

    .preference-item .dropdown {
        width: 150px;
    }
</style>
