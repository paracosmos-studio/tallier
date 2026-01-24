<script lang="ts">
    import WindowControls from '$lib/components/window-controls.svelte';
    import WindowTitle from '$lib/components/window-title.svelte';

    import "$lib/styles/fonts.css";
    import "$lib/styles/global.css";

    let { children } = $props();
</script>

<div class="titlebar" data-tauri-drag-region>
    <WindowControls />
    <WindowTitle />
</div>

<div class="app-content-wrapper">
    <div class="app-content">
        {@render children()}
    </div>
</div>

<style>
    .titlebar {
        height: 30px;
        background: var(--color-background);
        user-select: none;
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        border: 1px solid var(--gray-60);
        border-bottom: none;
        border-radius: 15px 15px 0 0;
        padding: 0.4rem 0.65rem;
        box-sizing: border-box;
        z-index: 10;
    }

    /* used for dark background in fullscreen */
    .app-content-wrapper {
        background: var(--color-background);
        border: 1px solid var(--gray-60);
        border-top: none;
        border-radius: 15px;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    /* used for setting paddings, and max-width on large window */
    .app-content {
        margin: 0 auto;
        padding: 2rem 0.65rem 0.65rem;
        box-sizing: border-box;
    }

    @media screen and (min-width: 800px) {
        .titlebar {
            border: none;
        }

        .app-content-wrapper {
            border: none;
            border-radius: 0;
        }

        .app-content {
            max-width: 400px;
            margin: 0 auto;
        }
    }
</style>