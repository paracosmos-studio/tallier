<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    "Update available" prompt driven by the shared `updatePrompt` state in
    $lib/updater.svelte. Rendered once in the root layout; both the startup
    auto-check and the About tab's manual check open it via openUpdatePrompt.
    Takes no props.
-->

<script lang="ts">
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import { updatePrompt, dismissUpdatePrompt, installAndRelaunch } from "$lib/updater.svelte";

    let installing: boolean = $state(false);

    async function handleInstall() {
        if (installing) return;
        installing = true;
        try {
            await installAndRelaunch();
        } finally {
            installing = false;
        }
    }

    function handleLater() {
        if (installing) return;
        dismissUpdatePrompt();
    }
</script>

<DialogConfirm
    open={updatePrompt.update !== null}
    title="Update Available"
    message={`Tallier ${updatePrompt.update?.version ?? ""} is available. Install now and restart?`}
    confirmLabel={installing ? "Installing..." : "Install & Restart"}
    cancelLabel="Later"
    confirmColor="var(--green)"
    onconfirm={handleInstall}
    oncancel={handleLater}
/>
