<script lang="ts">
    import Icon from '$lib/components/icon.svelte';
    import { ChartBar, Alarm, Contract, Settings } from '$lib/icons';
</script>

<nav class="menu">
    <a href="/reports" class="menu-item" title="Reports">
        <Icon path={ChartBar} size="18" fill="currentColor" />
        <!-- <span>Reports</span> -->
    </a>
    <a href="/timesheet" class="menu-item" title="Timesheet">
        <Icon path={Alarm} size="18" fill="currentColor" />
        <!-- <span>Timesheet</span> -->
    </a>
    <a href="/invoice" class="menu-item" title="Invoice">
        <Icon path={Contract} size="18" fill="currentColor" />
        <!-- <span>Invoice</span> -->
    </a>
    <a href="/settings" class="menu-item" title="Settings">
        <Icon path={Settings} size="18" fill="currentColor" />
        <!-- <span>Settings</span> -->
    </a>
</nav>

<style>
    .menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0rem;
        margin: 1.3rem 0;
    }

    .menu-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
        padding: 0rem 1.2rem;
        transition: all 0.2s ease;
    }

    .menu-item:hover {
        text-decoration: none;
        color: var(--green);
        transform: scale(1.3) rotate(5deg);
    }

    /* .menu-item span {
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        white-space: nowrap;
        font-size: 0.85rem;
        transition: max-width 0.2s ease, opacity 0.15s ease;
    }

    .menu-item:hover span {
        max-width: 100px;
        opacity: 1;
    } */
</style>