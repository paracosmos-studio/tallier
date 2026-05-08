const MONTHS: readonly string[] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS: readonly string[] = [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
];

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
    const hour: number = parseInt(h, 10);
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
 * Rounds a duration in seconds to the nearest `minutes` step.
 */
function roundSeconds(seconds: number, minutes: number): number {
    if (minutes <= 0) return seconds;
    const step: number = minutes * 60;
    return Math.round(seconds / step) * step;
}

/**
 * Parses an "HH:MM" or "HH:MM:SS" string into seconds since midnight.
 */
function timeToSeconds(hhmmss: string): number {
    if (!hhmmss) return 0;
    const [h, m, s] = hhmmss.split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

export {
    MONTHS,
    DAYS,
    formatDuration,
    formatTimeOfDay,
    formatDateISO,
    formatDateLong,
    formatDateShort,
    roundSeconds,
    timeToSeconds,
};
