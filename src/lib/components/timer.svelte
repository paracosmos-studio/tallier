<script lang="ts">
    import Icon from '$lib/components/icon.svelte';
    import { PlayCircle, StopCircle } from '$lib/icons';

    let isRunning = $state(false);
</script>

<div class="timer">
    <h1>08:14:01</h1>
    <button title={isRunning ? "Stop Timer" : "Start Timer"} onclick={() => (isRunning = !isRunning)} class:running={isRunning}>
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
</style>