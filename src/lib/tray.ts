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
): Promise<void> {
    await invoke("set_tray_timer", {
        baseElapsed,
        startedAtMs: startedAtMs ?? null,
        projects,
        selectedId: selectedId ?? null,
        showTitle,
    });
}

export async function setTrayShowTitle(show: boolean): Promise<void> {
    await invoke("set_tray_show_title", { show });
}
