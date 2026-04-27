<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Footer from "$lib/components/footer.svelte";
    import Select from "$lib/components/select.svelte";
    import SelectDirectory from "$lib/components/select-directory.svelte";
    import Toggle from "$lib/components/toggle.svelte";

    import { resizeWindow } from "$lib/window";
    import { onMount } from "svelte";
    import { Play } from "$lib/icons";
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
    })

    onMount(async () => {
        const stored = await getSetting("taskbarDisplay");
        if (stored !== null) settings.taskbarDisplay = stored === "true";
        return await resizeWindow(400, 600);
    });

    async function handleTaskbarToggle(checked: boolean) {
        settings.taskbarDisplay = checked;
        await setSetting("taskbarDisplay", String(checked));
        await setTrayShowTitle(checked);
    }
</script>

<main>
    <PageNavigation previousPage="/" />

    <a href="/projects" class="manage-projects">
        <span>Manage Projects</span>
        <Icon path={Play} size="24" fill="currentColor" />
    </a>

    <label for="app-dir">Application Data</label>
    <SelectDirectory id="app-dir" onselect={(path) => console.log("Selected directory:", path)} />

    <label for="preferences">Preferences</label>
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
</main>
<Footer />

<style>
    .manage-projects {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--yellow);
        border-radius: 5px;
        padding: 0.45rem 1rem;
        color: var(--gray-90);
        text-decoration: none;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
        transition: all 0.2s ease;
        margin-bottom: 1.5rem;
    }

    .manage-projects:hover {
        text-decoration: none;
        opacity: 0.9;
    }

    label {
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;
        font-weight: 400;
        color: var(--yellow);
        margin: 1rem 0 0.4rem 0;
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