import { formatDateISO } from "./format";

export interface DateRange {
    start: string;
    end: string;
}

export const RANGE_OPTIONS: { value: string; label: string }[] = [
    { value: "7", label: "Last 7 days" },
    { value: "14", label: "Last 14 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 3 Months" },
    { value: "180", label: "Last 6 Months" },
    { value: "365", label: "Last Year" },
    { value: "all", label: "All Time" },
    { value: "custom", label: "Custom Range" },
];

export function computeDateRange(
    selectedRange: string,
    customStart: string,
    customEnd: string,
): DateRange | null {
    const today = new Date();
    const end = formatDateISO(today);

    if (selectedRange === "custom") {
        if (!customStart || !customEnd) return null;
        return { start: customStart, end: customEnd };
    }
    if (selectedRange === "all") {
        return { start: "2000-01-01", end };
    }
    const days = parseInt(selectedRange);
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    return { start: formatDateISO(start), end };
}
