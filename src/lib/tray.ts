// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";

export interface TrayProject {
    id: number;
    name: string;
}

export async function setTrayTimer(
    baseElapsed: number,
    startedAtMs?: number,
    projects: TrayProject[] = [],
    selectedId?: number,
    showTitle: boolean = true,
    maxSeconds?: number,
    limitReached: boolean = false,
    autoPauseOnSleep: boolean = false,
): Promise<void> {
    await invoke("set_tray_timer", {
        baseElapsed,
        startedAtMs: startedAtMs ?? null,
        projects,
        selectedId: selectedId ?? null,
        showTitle,
        maxSeconds: maxSeconds ?? null,
        limitReached,
        autoPauseOnSleep,
    });
}

export async function setTrayShowTitle(show: boolean): Promise<void> {
    await invoke("set_tray_show_title", { show });
}

export async function setTrayAutoPause(enabled: boolean): Promise<void> {
    await invoke("set_tray_auto_pause", { enabled });
}
