<!--
    @component
    Reusable export dialog. Collects a format, an optional "include notes"
    toggle, and a save location. The caller supplies the format list and wires
    the actual export pipeline via `onexport`, and may pass an `error` message
    back to surface failures inline.

    @param {boolean} open - Controls dialog visibility.
    @param {ExportFormatOption[]} formats - Selectable output formats.
    @param {string} [title="Export"] - Dialog heading.
    @param {string} [defaultFormat] - Initially selected format (defaults to the first enabled option).
    @param {boolean} [showNotes=false] - Whether to show the "include title and summary" toggle.
    @param {(data: { format: string; includeNotes: boolean; location: string }) => void} onexport - Export callback.
    @param {() => void} onclose - Close callback.
    @param {string | null} [error] - Error message to display under the form.
-->
<script lang="ts" module>
    export type ExportFormatOption = { value: string; label: string; disabled?: boolean };
</script>

<script lang="ts">
    import Dialog from "$lib/components/dialogs/dialog.svelte";
    import RadioGroup from "$lib/components/radio-group.svelte";
    import Toggle from "$lib/components/toggle.svelte";
    import SelectDirectory from "$lib/components/select-directory.svelte";
    import Button from "$lib/components/button.svelte";

    type Props = {
        open: boolean;
        formats: ExportFormatOption[];
        title?: string;
        defaultFormat?: string;
        showNotes?: boolean;
        onexport: (data: { format: string; includeNotes: boolean; location: string }) => void;
        onclose: () => void;
        error?: string | null;
    };

    let {
        open,
        formats,
        title = "Export",
        defaultFormat,
        showNotes = false,
        onexport,
        onclose,
        error = null,
    }: Props = $props();

    const DEFAULT_LOCATION: string = "~/Desktop";

    const initialFormat = (): string =>
        defaultFormat ?? formats.find((f) => !f.disabled)?.value ?? "";

    let format: string = $state(initialFormat());
    let includeNotes: boolean = $state(true);
    let location: string = $state(DEFAULT_LOCATION);

    $effect(() => {
        if (open) {
            format = initialFormat();
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

<Dialog {open} {title} width="480px" {onclose}>
    <div class="form">
        <div class="field">
            <span class="field-label">Format</span>
            <RadioGroup options={formats} name="export-format" bind:value={format} size="sm" />
        </div>

        {#if showNotes}
            <div class="toggle-row">
                <span class="toggle-label">Include entry title and summary</span>
                <Toggle bind:checked={includeNotes} />
            </div>
        {/if}

        <div class="field">
            <span class="field-label">Save location</span>
            <SelectDirectory
                id="exp-location"
                defaultDirectory={DEFAULT_LOCATION}
                onselect={(path) => (location = path)}
            />
        </div>
        {#if error}
            <p class="error">{error}</p>
        {/if}
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
        border: 1px solid var(--gray-60);
        margin: 0;
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

    .error {
        margin: 0;
        font-size: 0.7rem;
        color: var(--red);
    }
</style>
