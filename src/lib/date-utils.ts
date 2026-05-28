/**
 * Week-anchoring helpers.
 *
 * `weekStartsOn` follows `Date.getDay()` semantics: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 * All helpers are pure and locale-neutral — no DB or settings reads here.
 */

import { DAYS } from "./format";

export const WEEK_START_SETTING_KEY = "weekStartsOn";
export const DEFAULT_WEEK_START = 1;

/** Returns a new Date at midnight on the first day of the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: number): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const offset = (d.getDay() - weekStartsOn + 7) % 7;
    d.setDate(d.getDate() - offset);
    return d;
}

/** Returns the last day of the week (start + 6 days) containing `date`. */
export function endOfWeek(date: Date, weekStartsOn: number): Date {
    const s = startOfWeek(date, weekStartsOn);
    s.setDate(s.getDate() + 6);
    return s;
}

/** Returns the 7 short day labels ordered to match `weekStartsOn`. */
export function orderedDayLabels(weekStartsOn: number): string[] {
    return Array.from({ length: 7 }, (_, i) => DAYS[(weekStartsOn + i) % 7]);
}

/** Parses a stored setting value into a valid 0-6 index; falls back to default. */
export function parseWeekStartsOn(value: string | null | undefined): number {
    if (value === null || value === undefined) return DEFAULT_WEEK_START;
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 && n <= 6 ? n : DEFAULT_WEEK_START;
}
