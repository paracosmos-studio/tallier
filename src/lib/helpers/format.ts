// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

const MONTHS: readonly string[] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS: readonly string[] = [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
];

const SECONDS_PER_DAY: number = 86400;

/**
 * Formats a duration in seconds as a human-readable string.
 * Examples: 3725 -> "1h 2m"; 65 -> "1m" (or "1m 5s" with includeSeconds);
 * 0 -> "0m" (or "0s" with includeSeconds).
 */
function formatDuration(seconds: number, includeSeconds: boolean = false): string {
    const h: number = Math.floor(seconds / 3600);
    const m: number = Math.floor((seconds % 3600) / 60);
    const s: number = Math.floor(seconds % 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return includeSeconds ? `${m}m ${s}s` : `${m}m`;
    return includeSeconds ? `${s}s` : "0m";
}

/**
 * Converts a "HH:MM" or "HH:MM:SS" 24h time into a 12h clock string like "3:05pm".
 */
function formatTimeOfDay(time: string): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour: number = parseInt(h, 10) % 24;
    const suffix: string = hour >= 12 ? "pm" : "am";
    const display: number = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${display}:${m}${suffix}`;
}

/**
 * Returns a Date as "YYYY-MM-DD" using local time (suitable for SQL date columns).
 */
function formatDateISO(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * "YYYY-MM-DD" -> "Mon, Jan 5".
 */
function formatDateLong(dateStr: string): string {
    const d: Date = new Date(dateStr + "T00:00:00");
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * "YYYY-MM-DD" -> "Jan 5".
 */
function formatDateShort(dateStr: string): string {
    const d: Date = new Date(dateStr + "T00:00:00");
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * "YYYY-MM-DD" -> "Jan 5, 2026".
 */
function formatDateMedium(dateStr: string): string {
    const d: Date = new Date(dateStr + "T00:00:00");
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Rounds a duration in seconds to the nearest `minutes` step.
 */
function roundSeconds(seconds: number, minutes: number): number {
    if (minutes <= 0) return seconds;
    const step: number = minutes * 60;
    return Math.round(seconds / step) * step;
}

/**
 * Rounds a "HH:MM" or "HH:MM:SS" wall-clock time to the nearest `minutes`
 * step and returns it as "HH:MM:SS". Returns the input unchanged when
 * `minutes <= 1`. Preserves seconds beyond 24:00:00 if the rounded value
 * exceeds a day boundary (used by the export pipeline).
 */
function roundTimeOfDay(time: string, minutes: number): string {
    if (!time || minutes <= 1) return time;
    const sec: number = roundSeconds(timeToSeconds(time), minutes);
    const h: number = Math.floor(sec / 3600);
    const m: number = Math.floor((sec % 3600) / 60);
    const s: number = sec % 60;
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Parses an "HH:MM" or "HH:MM:SS" string into seconds since midnight.
 */
function timeToSeconds(hhmmss: string): number {
    if (!hhmmss) return 0;
    const [h, m, s] = hhmmss.split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

/**
 * Returns the duration in seconds between two "HH:MM:SS" times.
 * If `end` is at or before `start`, treats `end` as the next day.
 */
function computeDuration(start: string, end: string): number {
    const s: number = timeToSeconds(start);
    const e: number = timeToSeconds(end);
    return e > s ? e - s : e + SECONDS_PER_DAY - s;
}

/**
 * Returns the next day's "YYYY-MM-DD" for a given ISO date string.
 */
function nextDateISO(dateStr: string): string {
    const d: Date = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
}

export {
    MONTHS,
    DAYS,
    SECONDS_PER_DAY,
    formatDuration,
    formatTimeOfDay,
    formatDateISO,
    formatDateLong,
    formatDateShort,
    formatDateMedium,
    roundSeconds,
    roundTimeOfDay,
    timeToSeconds,
    computeDuration,
    nextDateISO,
};
