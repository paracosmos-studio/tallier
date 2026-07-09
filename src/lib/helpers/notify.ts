// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";

/**
 * Shows a desktop notification, requesting permission first if needed. A denied
 * permission silently no-ops.
 *
 * @param title - Notification title.
 * @param body - Notification body.
 */
export async function notify(title: string, body: string): Promise<void> {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  if (granted) await invoke("plugin:notification|notify", { options: { title, body } });
}
