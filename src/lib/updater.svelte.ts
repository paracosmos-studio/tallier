// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getSetting, getRunningTimer, stopTimer } from "$lib/db";
import { notify } from "$lib/helpers/notify";

export const AUTO_UPDATE_SETTING_KEY = "autoUpdate";

// shared prompt state consumed by dialog-update.svelte (rendered once in the
// root layout). mutate `.update`, never reassign the export.
export const updatePrompt = $state<{ update: Update | null }>({ update: null });

let available: Promise<boolean> | undefined;

// whether this binary can self-update. false in the App Store build, where
// the updater plugin is compiled out and all update UI must stay hidden.
export function updaterAvailable(): Promise<boolean> {
    available ??= invoke<boolean>("updater_available").catch(() => false);
    return available;
}

// null when up to date or when the build has no updater.
export async function checkForUpdate(): Promise<Update | null> {
    if (!(await updaterAvailable())) return null;
    return await check();
}

export function openUpdatePrompt(update: Update): void {
    updatePrompt.update = update;
}

export function dismissUpdatePrompt(): void {
    updatePrompt.update = null;
}

// relaunch() bypasses the layout's close-confirm guard, so stop a running
// timer first; the entry must not be left dangling across the restart.
export async function installAndRelaunch(): Promise<void> {
    const update = updatePrompt.update;
    if (!update) return;
    try {
        const running = await getRunningTimer();
        if (running?.id != null) await stopTimer(running.id);
        await update.downloadAndInstall();
        await relaunch();
    } catch {
        await notify("Update failed", "Could not download or install the update.");
        dismissUpdatePrompt();
    }
}

// startup check, gated by the autoUpdate setting (default on). silent on
// every failure: an offline launch must not surface errors.
export async function runStartupUpdateCheck(): Promise<void> {
    try {
        const enabled = (await getSetting(AUTO_UPDATE_SETTING_KEY)) !== "false";
        if (!enabled) return;
        const update = await checkForUpdate();
        if (update) openUpdatePrompt(update);
    } catch {
        // ignore: no network, endpoint missing, etc.
    }
}
