<script lang="ts">
    import { open } from "@tauri-apps/plugin-dialog";
    import Icon from "$lib/components/icon.svelte";
    import { HardDrive, FolderOpen } from "$lib/icons";

    type Props = {
        defaultDirectory?: string;
        onselect: (path: string) => void;
        id?: string;
    };

    let { defaultDirectory, onselect, id = "sel-dir" }: Props = $props();

    let selectedPath = $state("");

    $effect(() => {
        if (defaultDirectory && !selectedPath) {
            selectedPath = defaultDirectory;
        }
    });

    async function handleSelectDirectory() {
        const result = await open({
            directory: true,
            multiple: false,
            defaultPath: selectedPath || undefined
        });

        if (result) {
            selectedPath = result;
            onselect(result);
        }
    }

    let displayPath = $derived(selectedPath || "select directory");
</script>

<!--
    @component
    A directory selection component that allows users to choose a directory from their file system.

    @param {string} [defaultDirectory] - The default directory path to display when the component is initialized.
    @param {(path: string) => void} onselect - Callback function that is called when a directory is selected. Receives the selected directory path as an argument.
-->
<div class="sel-dir" id={id}>
    <div class="sel-dir-path">
        <Icon path={HardDrive} size="24" fill="var(--gray-20)" />
        <span class="trimmed" title={displayPath}>
            {displayPath}
        </span>
    </div>
    <button class="sel-dir-action" onclick={handleSelectDirectory}>
        <Icon path={FolderOpen} size="24" fill="var(--green)" />
    </button>
</div>

<style>
    .sel-dir {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
        margin: 5px 0;
        width: 100%;
    }

    .sel-dir-path {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex: 1;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: var(--gray-20);
        background-color: var(--gray-80);
        border-radius: 5px;
        padding: 0.2rem 0.5rem;
        user-select: auto;
        -webkit-user-select: auto;
    }

    .sel-dir-action {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--gray-80);
        border: none;
        border-radius: 5px;
        padding: 0.2rem 0.5rem;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .trimmed {
        max-width: 265px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        direction: rtl;
        text-align: left;
    }

    .trimmed::before {
        content: "\200E";
    }
</style>