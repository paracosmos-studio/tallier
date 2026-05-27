<!--
    @component
    Timesheet calendar view: a fixed 7-column Sunday-anchored week with hours
    down the left and daily totals across the bottom. Each entry renders as a
    colored block positioned by its start time and sized by its duration.
    When the active range spans more than a week, the header offers prev/next
    paging instead of horizontal scrolling. Tapping a block opens the edit
    dialog (view-only override, like the week view).

    @param {ReportEntry[]} entries - entries already filtered by range and projects.
    @param {Project[]} projects - all projects, for the edit dialog's project picker.
    @param {Map<number, string>} colorMap - project ID to color map.
    @param {number} roundMinutes - round each entry duration to this many minutes.
    @param {string} start - active range start (YYYY-MM-DD).
    @param {string} end - active range end (YYYY-MM-DD).
-->
<script lang="ts">
    import DialogEditEntry from "$lib/components/dialogs/dialog-edit-entry.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { ArrowBack, ArrowForward } from "$lib/icons";
    import { formatDuration, formatDateISO, formatTimeOfDay, formatDateMedium, MONTHS, DAYS } from "$lib/format";
    import { buildCalendarDays } from "$lib/timesheet";
    import type { ReportEntry, Project } from "$lib/types";
    import type { CalendarDay, EntryOverride } from "$lib/timesheet";

    type Props = {
        entries: ReportEntry[];
        projects: Project[];
        colorMap: Map<number, string>;
        roundMinutes: number;
        start: string;
        end: string;
    };

    let { entries, projects, colorMap, roundMinutes, start, end }: Props = $props();

    const HOURS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);
    const SECONDS_PER_HOUR: number = 3600;
    const MS_PER_DAY: number = 86_400_000;

    // swap digit zero with letter O so the calendar's mono numerals match a
    // single open-zero glyph everywhere
    const o0 = (s: string): string => s.replace(/0/g, "O");

    function hourLabel(h: number): string {
        if (h === 0) return "12am";
        if (h < 12) return `${h}am`;
        if (h === 12) return "12pm";
        return `${h - 12}pm`;
    }

    let hiddenIds: Set<number> = $state(new Set());
    let overrides: Map<number, EntryOverride> = $state(new Map());
    let editOpen: boolean = $state(false);
    let editEntry: ReportEntry | null = $state(null);
    let weekIdx: number = $state(0);
    let scrollerEl: HTMLDivElement | undefined = $state();

    let projectNames: Map<number, string> = $derived.by(() => {
        const m = new Map<number, string>();
        for (const p of projects) {
            if (p.id != null) m.set(p.id, p.name);
        }
        return m;
    });

    let dayMap: Map<string, CalendarDay> = $derived.by(() => {
        const m = new Map<string, CalendarDay>();
        for (const d of buildCalendarDays(entries, roundMinutes, hiddenIds, overrides, projectNames)) {
            m.set(d.date, d);
        }
        return m;
    });

    // sunday-anchored week starts spanning [start, end]
    let weekStarts: string[] = $derived.by(() => {
        if (!start || !end) return [];
        const s = sundayOf(start);
        const e = sundayOf(end);
        const count = Math.round((e.getTime() - s.getTime()) / MS_PER_DAY / 7) + 1;
        const out: string[] = [];
        for (let i = 0; i < count; i++) {
            const d = new Date(s);
            d.setDate(s.getDate() + i * 7);
            out.push(formatDateISO(d));
        }
        return out;
    });

    let currentWeekStart: string = $derived(weekStarts[Math.min(weekIdx, weekStarts.length - 1)] ?? "");

    let weekDates: string[] = $derived.by(() => {
        if (!currentWeekStart) return [];
        const base = new Date(currentWeekStart + "T00:00:00");
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return formatDateISO(d);
        });
    });

    const today: string = formatDateISO(new Date());

    // reset paging when range changes
    $effect(() => {
        const _ = start + end;
        weekIdx = 0;
    });

    // anchor the scroll to one hour before the first block of the visible week
    $effect(() => {
        if (!scrollerEl) return;
        let earliest = Infinity;
        for (const date of weekDates) {
            const d = dayMap.get(date);
            if (!d || d.blocks.length === 0) continue;
            const first = d.blocks[0].startSeconds;
            if (first < earliest) earliest = first;
        }
        if (!isFinite(earliest)) {
            scrollerEl.scrollTop = 0;
            return;
        }
        const hourH = parseFloat(getComputedStyle(scrollerEl).getPropertyValue("--hour-h")) || 22;
        const targetHour = Math.max(0, Math.floor(earliest / 3600) - 1);
        scrollerEl.scrollTop = targetHour * hourH;
    });

    function sundayOf(dateStr: string): Date {
        const d: Date = new Date(dateStr + "T00:00:00");
        d.setDate(d.getDate() - d.getDay());
        return d;
    }

    function dayHeader(date: string): { mon: string; day: string; dow: number; dowLabel: string; inRange: boolean } {
        const d: Date = new Date(date + "T00:00:00");
        const dow = d.getDay();
        return {
            mon: MONTHS[d.getMonth()],
            day: String(d.getDate()),
            dow,
            dowLabel: DAYS[dow],
            inRange: date >= start && date <= end,
        };
    }

    function weekLabel(weekStart: string): string {
        const s = new Date(weekStart + "T00:00:00");
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        return `${formatDateMedium(weekStart)} - ${formatDateMedium(formatDateISO(e))}`;
    }

    function openEdit(entry: ReportEntry): void {
        editEntry = entry;
        editOpen = true;
    }

    function handleSave(data: {
        entryId: number;
        projectId: number;
        title: string | null;
        summary: string | null;
        date: string;
        start: string;
        end: string;
    }): void {
        const next = new Map(overrides);
        next.set(data.entryId, {
            projectId: data.projectId,
            title: data.title,
            summary: data.summary,
            date: data.date,
            start: data.start,
            end: data.end,
        });
        overrides = next;
        editOpen = false;
        editEntry = null;
    }

    function closeEdit(): void {
        editOpen = false;
        editEntry = null;
    }
</script>

{#if weekDates.length === 0}
    <p class="empty">No entries to display.</p>
{:else}
    <div class="calendar">
        {#if weekStarts.length > 1}
            <header class="pager">
                <button
                    class="page-btn"
                    title="Previous week"
                    disabled={weekIdx === 0}
                    onclick={() => (weekIdx = Math.max(0, weekIdx - 1))}
                >
                    <Icon path={ArrowBack} size="14" fill="currentColor" />
                </button>
                <span class="range">{weekLabel(currentWeekStart)}</span>
                <button
                    class="page-btn"
                    title="Next week"
                    disabled={weekIdx >= weekStarts.length - 1}
                    onclick={() => (weekIdx = Math.min(weekStarts.length - 1, weekIdx + 1))}
                >
                    <Icon path={ArrowForward} size="14" fill="currentColor" />
                </button>
                <span class="counter">{o0(`${weekIdx + 1} / ${weekStarts.length}`)}</span>
            </header>
        {/if}

        <div class="scroller" bind:this={scrollerEl}>
            <div class="grid">
                <div class="corner head"></div>
                {#each weekDates as date (date)}
                    {@const h = dayHeader(date)}
                    <div
                        class="day-head head"
                        class:weekend={h.dow === 0 || h.dow === 6}
                        class:today={date === today}
                        class:out={!h.inRange}
                    >
                        <span class="label">{h.mon} {h.day}</span>
                        <span class="dow">{h.dowLabel}</span>
                    </div>
                {/each}

                <div class="hours">
                    {#each HOURS as h (h)}
                        <div class="hour-row">
                            <span class="hour-label">{o0(hourLabel(h))}</span>
                        </div>
                    {/each}
                </div>
                {#each weekDates as date (date)}
                    {@const h = dayHeader(date)}
                    {@const d = dayMap.get(date)}
                    <div
                        class="day-col"
                        class:weekend={h.dow === 0 || h.dow === 6}
                        class:today={date === today}
                        class:out={!h.inRange}
                    >
                        {#each HOURS as hr (hr)}
                            <div class="hour-line" style:--hour={hr}></div>
                        {/each}
                        {#if d}
                            {#each d.blocks as b (b.entryId + "-" + b.start)}
                                {@const color = colorMap.get(b.projectId) ?? "var(--gray-40)"}
                                <button
                                    type="button"
                                    class="block"
                                    style:--start={b.startSeconds / SECONDS_PER_HOUR}
                                    style:--dur={b.durationSeconds / SECONDS_PER_HOUR}
                                    style:--project-color={color}
                                    title={`${b.projectName} - ${formatTimeOfDay(b.start)} to ${formatTimeOfDay(b.end)}`}
                                    onclick={() => openEdit(b.entry)}
                                >
                                    <span class="pname">{b.projectName}</span>
                                    <span class="time">{o0(`${formatTimeOfDay(b.start)} - ${formatTimeOfDay(b.end)}`)}</span>
                                </button>
                            {/each}
                        {/if}
                    </div>
                {/each}

            </div>
        </div>
        <div class="foot-row">
            <div class="corner-foot" aria-label="Total">∑</div>
            {#each weekDates as date (date)}
                {@const d = dayMap.get(date)}
                {@const total = d?.totalRounded ?? 0}
                <div
                    class="day-foot"
                    class:today={date === today}
                    class:empty={total === 0}
                >
                    {total === 0 ? "" : o0(formatDuration(total))}
                </div>
            {/each}
        </div>
    </div>
{/if}

<DialogEditEntry
    open={editOpen}
    entry={editEntry}
    {projects}
    showReason={false}
    notice="Edits here only affect this timesheet view. The original log in the database is unchanged."
    onsave={handleSave}
    onclose={closeEdit}
/>

<style>
    .empty {
        text-align: center;
        color: var(--gray-40);
        font-size: 0.85rem;
    }

    .calendar {
        --hour-h: 30px;
        --hour-col: 44px;
        --head-h: 44px;
        --foot-h: 28px;
        display: flex;
        flex-direction: column;
        height: calc(100vh - 140px);
    }

    .pager {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 2px 6px 2px;
    }

    .page-btn {
        background: none;
        border: none;
        padding: 4px 0;
        cursor: pointer;
        color: var(--gray-10);
        border-radius: 3px;
        display: flex;
        transition: color 0.15s ease;
    }

    .page-btn:hover:not(:disabled) {
        color: var(--green);
    }

    .page-btn:disabled {
        color: var(--gray-50);
        cursor: not-allowed;
    }

    .pager .range {
        font-size: 0.7rem;
        color: var(--gray-30);
        margin: 0 6px;
        text-transform: uppercase;
    }

    .pager .counter {
        margin-left: auto;
        font-family: 'DM Mono', monospace;
        font-size: 0.66rem;
        color: var(--gray-40);
    }

    .scroller {
        flex: 1;
        min-height: 0;
        overflow: auto;
        border: 1px solid var(--gray-80);
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        background: var(--gray-90);
    }

    .scroller::-webkit-scrollbar-track {
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
    }

    .scroller::-webkit-scrollbar-thumb {
        background: var(--gray-60);
    }

    .scroller::-webkit-scrollbar-thumb:hover {
        background: var(--gray-50);
    }

    .grid {
        display: grid;
        grid-template-columns: var(--hour-col) repeat(7, minmax(0, 1fr));
        grid-template-rows: var(--head-h) minmax(calc(var(--hour-h) * 24), 1fr);
        min-height: 100%;
    }

    .head {
        position: sticky;
        top: 0;
        z-index: 3;
        background: var(--gray-80);
        border-bottom: 1px solid var(--gray-70);
    }

    .corner {
        position: sticky;
        left: 0;
        z-index: 4;
        background: color-mix(in srgb, var(--gray-80) 55%, var(--color-background));
        border-right: 1px solid var(--gray-80);
    }

    .day-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        padding: 5px 0;
        border-right: 1px solid var(--gray-80);
    }

    .day-head .label {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--gray-20);
    }

    .day-head .dow {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--gray-40);
    }

    .day-head.today {
        background: color-mix(in srgb, var(--green) 14%, var(--gray-80));
    }

    .day-head.today .label,
    .day-head.today .dow {
        color: var(--green);
    }

    .day-head.out .label,
    .day-head.out .dow {
        opacity: 0.4;
    }

    .hours {
        position: sticky;
        left: 0;
        z-index: 2;
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
        border-right: 1px solid var(--gray-80);
    }

    .hour-row {
        height: var(--hour-h);
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 1px 6px 0 0;
        box-sizing: border-box;
    }

    .hour-label {
        font-family: 'DM Mono', monospace;
        font-size: 0.62rem;
        color: var(--gray-40);
        line-height: 1;
    }

    .day-col {
        position: relative;
        border-right: 1px solid var(--gray-80);
    }

    .day-col.weekend {
        background: color-mix(in srgb, var(--gray-80) 22%, transparent);
    }

    .day-col.today {
        background: color-mix(in srgb, var(--green) 6%, transparent);
    }

    .day-col.out {
        background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 6px,
            color-mix(in srgb, var(--gray-80) 25%, transparent) 6px,
            color-mix(in srgb, var(--gray-80) 25%, transparent) 7px
        );
    }

    .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(var(--hour) * var(--hour-h));
        height: 0;
        border-top: 1px dashed color-mix(in srgb, var(--gray-70) 60%, transparent);
    }

    .block {
        position: absolute;
        left: 1px;
        right: 1px;
        top: calc(var(--start) * var(--hour-h));
        height: calc(var(--dur) * var(--hour-h));
        min-height: 14px;
        background: color-mix(in srgb, var(--project-color) 14%, transparent);
        border: none;
        border-left: 3px solid color-mix(in srgb, var(--project-color) 65%, transparent);
        border-radius: 0;
        padding: 5px 5px 2px;
        text-align: left;
        font-family: inherit;
        color: var(--gray-10);
        cursor: pointer;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 1px;
        box-sizing: border-box;
        transition: all 0.12s ease;
    }

    .block:hover {
        background: color-mix(in srgb, var(--project-color) 22%, transparent);
    }

    .block .pname {
        font-size: 0.66rem;
        font-weight: 400;
        color: color-mix(in srgb, var(--project-color) 60%, var(--gray-10));
        white-space: normal;
        word-break: break-word;
        line-height: 1.2;
    }

    .block .time {
        font-family: 'DM Mono', monospace;
        font-size: 0.6rem;
        color: var(--gray-20);
        white-space: normal;
        word-break: break-word;
        line-height: 1.2;
    }

    .foot-row {
        display: grid;
        grid-template-columns: var(--hour-col) repeat(7, minmax(0, 1fr));
        background: var(--gray-90);
        border: 1px solid var(--gray-80);
        border-top: 1px solid var(--gray-70);
        border-radius: 0 0 6px 6px;
        height: var(--foot-h);
        flex-shrink: 0;
    }

    .corner-foot {
        background: color-mix(in srgb, var(--gray-90) 55%, var(--color-background));
        border-right: 1px solid var(--gray-80);
        border-bottom-left-radius: 6px;
        font-size: 1rem;
        color: var(--gray-20);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .day-foot {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'DM Mono', monospace;
        font-size: 0.72rem;
        color: var(--gray-10);
        border-right: 1px solid var(--gray-80);
        margin-top: 3px;
        line-height: 0;
    }

    .day-foot:last-child {
        border-right: none;
    }

    .day-foot.today {
        color: var(--green);
        font-weight: 500;
    }
</style>
