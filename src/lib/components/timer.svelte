<!--
    @component
    Displays an HH:MM:SS timer with start/stop controls.

    @param {boolean} [disabled=false] - disables the start button when no project is selected.
    @param {(timerId: number) => void} [onstart] - called when the user starts the timer; parent handles DB write and sets `running`.
    @param {(timerId: number) => void} [onstop] - called with the active timer ID when the user stops the timer.
    @param {{ timerId: number; startedAt: Date } | null} [running=null] - externally controlled running state for restoring an in-progress timer.
    @param {number} [baseElapsed=0] - pre-accumulated seconds for today shown when stopped, added to live elapsed when running.
-->
<script lang="ts">
    import { onDestroy } from 'svelte';
    import Icon from '$lib/components/icon.svelte';
    import { PlayCircle, StopCircle } from '$lib/icons';

    interface Props {
        disabled?: boolean;
        onstart?: (timerId: number) => void;
        onstop?: (timerId: number) => void;

        // for restoring a running timer, externally controlled
        running?: { timerId: number; startedAt: Date } | null;

        // accumulated seconds for this project today (shown when stopped, added to when running)
        baseElapsed?: number;
    }

    let {
        disabled = false,
        onstart,
        onstop,
        running = $bindable(null),
        baseElapsed = 0,
    }: Props = $props();

    let liveElapsed = $state(0);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    let isRunning = $derived(running !== null);
    let totalElapsed = $derived(baseElapsed + liveElapsed);

    let display = $derived.by(() => {
        const hours = Math.floor(totalElapsed / 3600);
        const minutes = Math.floor((totalElapsed % 3600) / 60);
        const seconds = totalElapsed % 60;
        return `${String(hours).padStart(2, 'O')}:${String(minutes).padStart(2, 'O')}:${String(seconds).padStart(2, 'O')}`.replaceAll('0', 'O');
    });

    function startTicking(startedAt: Date) {
        stopTicking();
        liveElapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        intervalId = setInterval(() => {
            liveElapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        }, 1000);
    }

    function stopTicking() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        liveElapsed = 0;
    }

    $effect(() => {
        if (running) {
            startTicking(running.startedAt);
        } else {
            stopTicking();
        }
    });

    function handleClick() {
        if (isRunning && running) {
            const timerId = running.timerId;
            onstop?.(timerId);
        } else if (!isRunning) {
            onstart?.(0); // parent handles the actual DB call and sets `running`
        }
    }

    onDestroy(() => {
        stopTicking();
    });
</script>

<div class="timer">
    <h1>{display}</h1>
    <button
        title={isRunning ? "Stop Timer" : "Start Timer"}
        onclick={handleClick}
        class:running={isRunning}
        disabled={!isRunning && disabled}
    >
        {#if isRunning}
            <Icon path={StopCircle} size="35" fill="var(--color-background)" />
            STOP
        {:else}
            <Icon path={PlayCircle} size="35" fill="var(--color-background)" />
            START
        {/if}
    </button>
</div>

<style>
    .timer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0rem;
        margin: 30px 0px 8px 0px;
    }

    .timer h1 {
        font-family: 'DM Mono', monospace;
        font-size: 2.6rem;
        font-weight: 400;
        margin: 0;
        padding: 0 20px;
        color: var(--color-text);
        background-color: var(--gray-80);
        border-radius: 6px;
        border: 1px solid var(--gray-70);
    }

    .timer button {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.3rem;
        padding: 0.9rem 0.5rem;
        background-color: var(--green);
        color: var(--color-background);
        border: none;
        border-radius: 4px;
        font-size: 1.35rem;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        max-width: 128px;
        transition: all 0.2s ease;
    }

    .timer button.running {
        background-color: var(--red);
    }

    .timer button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>