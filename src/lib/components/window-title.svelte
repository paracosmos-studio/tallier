<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Alarm, Settings, FolderOpen, ChartBar } from "$lib/icons";
    import { page } from '$app/state';

    interface TitleInfo {
        title: string;
        icon?: string;
    }

    const TitleMap: Record<string, TitleInfo> = {
        '/': {
            title: 'Tally'
        },
        '/projects': {
            title: 'Projects',
            icon: FolderOpen
        },
        '/settings': {
            title: 'Settings',
            icon: Settings
        },
        '/reports': {
            title: 'Reports',
            icon: ChartBar
        },
        '/reports/entries': {
            title: 'Entries',
            icon: ChartBar
        },
        '/timesheet': {
            title: 'Timesheet',
            icon: Alarm
        },
        '/invoice': {
            title: 'Invoice',
            icon: Alarm
        }
    }

    const pageTitle = $derived(() => {
        const path = page.url.pathname;
        return TitleMap[path]?.title || 'Tally';
    });

    const pageIcon = $derived(() => {
        const path = page.url.pathname;
        return TitleMap[path]?.icon || "";
    });
</script>

<!--
    @component
    Window title component displaying the current page title with an icon.
-->
<div class="title">
    {#if pageIcon() !== ""}
        <Icon path={pageIcon()} size="16" fill="var(--gray-20)" />
    {/if}
    <span>{pageTitle()}</span>
</div>

<style>
    .title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        font-size: 0.875rem;
        font-weight: 400;
        color: var(--gray-20);
        pointer-events: none;
        margin-left: -66px;
    }
</style>