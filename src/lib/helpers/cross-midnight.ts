import { nextDateISO, timeToSeconds, SECONDS_PER_DAY } from "./format";
import type { ReportEntry } from "$lib/types";

/**
 * Splits any entry whose `end` is on the next day into two segments
 * keyed to the days they actually touch. The original `entry_id` and
 * `timer_id` are preserved so edits and deletes still target the source
 * row. The `segment` field identifies the slice: "full" for normal rows,
 * "first" for the start-day slice, "second" for the next-day slice.
 */
export function splitCrossMidnight(rows: ReportEntry[]): ReportEntry[] {
    const out: ReportEntry[] = [];
    for (const r of rows) {
        if (!r.end || timeToSeconds(r.end) > timeToSeconds(r.start)) {
            out.push({ ...r, segment: "full" });
            continue;
        }
        const firstTotal: number = SECONDS_PER_DAY - timeToSeconds(r.start);
        out.push({
            ...r,
            end: "24:00:00",
            total: firstTotal,
            segment: "first",
            source_start: r.start,
            source_end: r.end,
            source_date: r.date,
        });
        out.push({
            ...r,
            date: nextDateISO(r.date),
            start: "00:00:00",
            total: r.total - firstTotal,
            segment: "second",
            source_start: r.start,
            source_end: r.end,
            source_date: r.date,
        });
    }
    return out;
}
