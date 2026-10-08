// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";

// settings key; "true" / "false", default off
export const TRACK_APP_USAGE_SETTING_KEY = "trackAppUsage";

let supported: Promise<boolean> | undefined;

// whether this build records the foreground app (macos + windows). false
// elsewhere, where the preference toggle stays hidden.
export function usageTrackingSupported(): Promise<boolean> {
    supported ??= invoke<boolean>("usage_tracking_supported").catch(() => false);
    return supported;
}

// idempotent for the running timer; safe to call again after a remount
export async function startUsageTracking(timerId: number): Promise<void> {
    await invoke("start_usage_tracking", { timerId });
}

// no-op when nothing is tracking. `endAtMs` clamps the recorded segments, used
// by auto-pause to end them at the pre-sleep moment.
export async function stopUsageTracking(endAtMs?: number): Promise<void> {
    await invoke("stop_usage_tracking", { endAtMs: endAtMs ?? null });
}
