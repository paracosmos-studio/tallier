// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { formatDateISO, nextDateISO, timeToSeconds } from "./format";
import { APP_COLORS } from "./colors";
import type { AppUsageRow, AppSeconds, StackedBarSegment } from "$lib/types";

export const UNTRACKED_KEY: string = "untracked";
export const UNTRACKED_LABEL: string = "Untracked";
export const UNTRACKED_COLOR: string = "var(--gray-60)";
export const OTHER_KEY: string = "other";
export const OTHER_COLOR: string = "var(--gray-40)";

/** apps that keep their own color and row; the rest fold into "Other" */
export const MAX_RANKED_APPS: number = 7;

type Window = readonly [number, number];

/**
 * Epoch ms of a local wall-clock time on a date. "24:00:00" (the end of a
 * cross-midnight first slice) rolls to the next day's midnight.
 */
export function localDateTimeMs(date: string, time: string): number {
    if (timeToSeconds(time) >= 86400) {
        return new Date(`${nextDateISO(date)}T00:00:00`).getTime();
    }
    return new Date(`${date}T${time}`).getTime();
}

/**
 * The window of a raw timer row in epoch ms. An end at or before the start
 * means the timer crossed midnight, matching `computeDuration`.
 */
export function timerWindowMs(date: string, start: string, end: string): Window {
    const s: number = localDateTimeMs(date, start);
    const endDate: string = timeToSeconds(end) > timeToSeconds(start) ? date : nextDateISO(date);
    return [s, localDateTimeMs(endDate, end)];
}

/**
 * Clips a segment to a window; null when they do not overlap. Entry edits
 * never rewrite `app_usage`, so every reader clips to what the timer now says.
 */
export function clipToWindow(row: AppUsageRow, win: Window): Window | null {
    const s: number = Math.max(row.started_at, win[0]);
    const e: number = Math.min(row.ended_at, win[1]);
    return e > s ? [s, e] : null;
}

function toAppSeconds(acc: Map<string, { name: string; ms: number }>): AppSeconds[] {
    return Array.from(acc, ([app_id, v]) => ({
        app_id,
        app_name: v.name,
        seconds: Math.round(v.ms / 1000),
    }))
        .filter(a => a.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds);
}

function accumulate(acc: Map<string, { name: string; ms: number }>, row: AppUsageRow, ms: number): void {
    const cur = acc.get(row.app_id);
    if (cur) cur.ms += ms;
    else acc.set(row.app_id, { name: row.app_name, ms });
}

/**
 * Per-app seconds of the rows that fall inside a window, descending.
 */
export function sumAppSeconds(rows: AppUsageRow[], win: Window): AppSeconds[] {
    const acc = new Map<string, { name: string; ms: number }>();
    for (const row of rows) {
        const clipped = clipToWindow(row, win);
        if (clipped) accumulate(acc, row, clipped[1] - clipped[0]);
    }
    return toAppSeconds(acc);
}

/**
 * Per-day per-app seconds for the daily chart. Each row is clipped to its
 * timer's window, then split at local midnight so the day buckets line up
 * with the cross-midnight split the project totals use.
 */
export function dailyAppSeconds(
    rows: AppUsageRow[],
    startDate: string,
    endDate: string
): Map<string, AppSeconds[]> {
    const days = new Map<string, Map<string, { name: string; ms: number }>>();
    for (const row of rows) {
        const clipped = clipToWindow(row, timerWindowMs(row.date, row.start, row.end));
        if (!clipped) continue;
        let cursor: number = clipped[0];
        while (cursor < clipped[1]) {
            const date: string = formatDateISO(new Date(cursor));
            const dayEnd: number = localDateTimeMs(nextDateISO(date), "00:00:00");
            const cut: number = Math.min(clipped[1], dayEnd);
            if (date >= startDate && date <= endDate) {
                let acc = days.get(date);
                if (!acc) {
                    acc = new Map();
                    days.set(date, acc);
                }
                accumulate(acc, row, cut - cursor);
            }
            cursor = cut;
        }
    }
    return new Map(Array.from(days, ([date, acc]) => [date, toAppSeconds(acc)]));
}

/**
 * Merges several per-app lists into one, descending.
 */
export function mergeAppSeconds(lists: Iterable<AppSeconds[]>): AppSeconds[] {
    const acc = new Map<string, AppSeconds>();
    for (const list of lists) {
        for (const a of list) {
            const cur = acc.get(a.app_id);
            if (cur) cur.seconds += a.seconds;
            else acc.set(a.app_id, { ...a });
        }
    }
    return Array.from(acc.values()).sort((a, b) => b.seconds - a.seconds);
}

/**
 * Assigns a palette color to the top apps of a ranked list; apps past the
 * cap are absent and render as "Other".
 */
export function rankAppColors(ranked: AppSeconds[], cap: number = MAX_RANKED_APPS): Map<string, string> {
    const colors = new Map<string, string>();
    ranked.slice(0, Math.min(cap, APP_COLORS.length)).forEach((a, i) => {
        colors.set(a.app_id, APP_COLORS[i]);
    });
    return colors;
}

/**
 * Label of the slice that folds the unranked apps together.
 */
export function otherLabel(count: number): string {
    return `Other (${count} ${count === 1 ? "app" : "apps"})`;
}

/**
 * Chart segments for one bucket: ranked apps in their colors, the rest
 * folded into one "Other" slice, and the uncovered remainder of `total`
 * as "Untracked" on top.
 */
export function usageSegments(
    apps: AppSeconds[],
    colors: Map<string, string>,
    total: number
): StackedBarSegment[] {
    const out: StackedBarSegment[] = [];
    let other: number = 0;
    let otherCount: number = 0;
    let tracked: number = 0;
    for (const a of apps) {
        tracked += a.seconds;
        const color = colors.get(a.app_id);
        if (color) {
            out.push({ key: a.app_id, label: a.app_name, value: a.seconds, color });
        } else {
            other += a.seconds;
            otherCount += 1;
        }
    }
    if (other > 0) {
        out.push({ key: OTHER_KEY, label: otherLabel(otherCount), value: other, color: OTHER_COLOR });
    }
    const untracked: number = total - tracked;
    if (untracked > 0) {
        out.push({ key: UNTRACKED_KEY, label: UNTRACKED_LABEL, value: untracked, color: UNTRACKED_COLOR });
    }
    return out;
}

/**
 * Two-letter badge for an app without a stored icon: initials of the first
 * two words, or the first two letters of a single word.
 */
export function appInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) {
        const w = words[0];
        return w.charAt(0).toUpperCase() + w.slice(1, 2).toLowerCase();
    }
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
