<!--
    @component
    Displays a 2x2 grid of report summary statistics.

    @param {number} totalSeconds - total tracked seconds in the range.
    @param {number} avgDailySeconds - average seconds per active day.
    @param {string} mostActiveProject - name of the most active project.
    @param {number} totalDays - number of days with tracked time.
-->
<script lang="ts">
    import { formatDuration } from "$lib/format";

    type Props = {
        totalSeconds: number;
        avgDailySeconds: number;
        mostActiveProject: string;
        totalDays: number;
    };

    let {
        totalSeconds,
        avgDailySeconds,
        mostActiveProject,
        totalDays
    }: Props = $props();
</script>

<section class="stats">
    <div class="stat">
        <span class="label">Total</span>
        <span class="value">{formatDuration(totalSeconds, true)}</span>
    </div>
    <div class="stat">
        <span class="label">Daily avg</span>
        <span class="value">{formatDuration(avgDailySeconds, true)}</span>
    </div>
    <div class="stat">
        <span class="label">Most active</span>
        <span class="value project">{mostActiveProject || "--"}</span>
    </div>
    <div class="stat">
        <span class="label">Days tracked</span>
        <span class="value">{totalDays}</span>
    </div>
</section>

<style>
    .stats {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
        margin-bottom: 16px;
    }

    @container app (min-width: 720px) {
        .stats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
        }
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        background: var(--gray-80);
        border-radius: 6px;
        min-width: 0;
    }

    .label {
        font-size: 0.7rem;
        font-weight: 500;
        color: var(--gray-30);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .value {
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--gray-10);
        overflow-wrap: anywhere;
    }

    .value.project {
        font-size: 0.85rem;
        font-weight: 500;
    }
</style>
