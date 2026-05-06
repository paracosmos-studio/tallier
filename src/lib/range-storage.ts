const KEY = "reports.range";

export interface RangeState {
    selectedRange?: string;
    customStart?: string;
    customEnd?: string;
}

export function loadRangeState(): RangeState {
    if (typeof sessionStorage === "undefined") return {};
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveRangeState(state: RangeState): void {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // ignore quota / serialization errors
    }
}
