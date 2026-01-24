<script lang="ts">
    import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
    import { goto } from '$app/navigation';

    type Props = {
        previousPage?: string;
        nextPage?: string;
        children?: () => any;
    };

    let {
        previousPage,
        nextPage,
        children
    }: Props = $props();

    const appWindow = getCurrentWindow();

    $effect(() => {
        if (!previousPage && !nextPage) {
            throw new Error(
                "PageNavigation component requires at least one of `previousPage` or `nextPage` props."
            );
        }
    });
</script>

<!--
    @component
    A page navigation component with a back button and a next button.

    @param {string} [previousPage] The URL of the previous page to navigate to.
    @param {string} [nextPage] The URL of the next page to navigate to.
    @param {() => any} children Content to display on the right side of the navigation bar.
-->
<div class="page-nav">
    {#if previousPage}
        <button
            onclick={async () => goto(previousPage)}
            class="page-nav-btn prev"
        >
            ← &nbsp;Back
        </button>
    {/if}
    {#if children}
        {@render children()}
    {/if}
    {#if nextPage}
        <button
            onclick={async () => goto(nextPage)}
            class="page-nav-btn next"
        >
            Next&nbsp; →
        </button>
    {/if}
</div>

<style>
    .page-nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        justify-items: center;
        gap: 1rem;
        margin: 20px 0;
    }

    .page-nav-btn {
        background: none;
        border: none;
        cursor: pointer;
        text-decoration: none;
        color: var(--yellow);
        font-size: 1rem;
        font-weight: 500;
        padding: 0;
        transition: all 0.2s;
    }

    .page-nav-btn:hover {
        filter: brightness(1.1);
    }

    .page-nav-btn.prev:hover {
        animation: slideBack 0.35s;
    }

    .page-nav-btn.next:hover {
        animation: slideForward 0.35s;
    }

    @keyframes slideBack {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-3px); }
    }

    @keyframes slideForward {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(3px); }
    }
</style>