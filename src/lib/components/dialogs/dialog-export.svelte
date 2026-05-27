<!--
    @component
    Dialog for exporting the current timesheet view. Collects format, an
    "include notes" toggle, and a save location. UI only; the actual export
    pipeline is wired up by the caller.

    @param {boolean} open - controls dialog visibility.
    @param {(data: { format: string; includeNotes: boolean; location: string }) => void} onexport - export callback.
    @param {() => void} onclose - close callback.
-->
<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import RadioGroup from "$lib/components/radio-group.svelte";
    import Toggle from "$lib/components/toggle.svelte";
    import SelectDirectory from "$lib/components/select-directory.svelte";
    import Button from "$lib/components/button.svelte";

    type Props = {
        open: boolean;
        onexport: (data: { format: string; includeNotes: boolean; location: string }) => void;
        onclose: () => void;
    };

    let { open, onexport, onclose }: Props = $props();

    const DEFAULT_LOCATION: string = "~/Desktop";

    const formatOptions = [
        { value: "csv", label: "CSV" },
        { value: "json", label: "JSON" },
        { value: "pdf", label: "PDF" },
    ];

    let format: string = $state("csv");
    let includeNotes: boolean = $state(true);
    let location: string = $state(DEFAULT_LOCATION);

    $effect(() => {
        if (open) {
            format = "csv";
            includeNotes = true;
            location = DEFAULT_LOCATION;
        }
    });

    let canExport: boolean = $derived(!!format && !!location);

    function handleExport(): void {
        if (!canExport) return;
        onexport({ format, includeNotes, location });
    }
</script>

<Dialog {open} title="Export Timesheet" width="480px" {onclose}>
    <div class="form">
        <div class="field">
            <span class="field-label">Format</span>
            <RadioGroup
                options={formatOptions}
                name="export-format"
                bind:value={format}
                size="sm"
            />
        </div>

        <div class="toggle-row">
            <span class="toggle-label">Include notes (title and summary)</span>
            <Toggle bind:checked={includeNotes} />
        </div>

        <div class="field">
            <span class="field-label">Save location</span>
            <SelectDirectory
                id="exp-location"
                defaultDirectory={DEFAULT_LOCATION}
                onselect={(path) => (location = path)}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button size="xs" onclick={onclose} bgColor="var(--gray-60)" fgColor="var(--gray-10)">Cancel</Button>
        <Button size="xs" onclick={handleExport} bgColor="var(--green)" disabled={!canExport}>Export</Button>
    {/snippet}
</Dialog>

<style>
    .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-bottom: 4px;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .field-label {
        font-size: 0.65rem;
        color: var(--gray-40);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .form :global(.sel-dir-path),
    .form :global(.sel-dir-action) {
        background-color: var(--gray-90);
    }

    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
    }

    .toggle-label {
        font-size: 0.8rem;
        color: var(--gray-10);
    }
</style>
