<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import DateRangeFilter from "$lib/components/date-range-filter.svelte";
    import { Download } from "$lib/icons";

    let selectedRange: string = $state("7");
    let customStart: string = $state("");
    let customEnd: string = $state("");
</script>

<main>
    <PageNavigation previousPage="/">
        <div class="nav-actions">
            <DateRangeFilter
                bind:selectedRange
                bind:customStart
                bind:customEnd
            />
            <Button size="xs" title="Export invoice" onclick={() => {}}>
                <Icon path={Download} size="16" />
                <span>Export</span>
            </Button>
        </div>
    </PageNavigation>
    <p>Invoice</p>
</main>

<style>
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }
</style>
