<script lang="ts">
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Button from "$lib/components/button.svelte";
    import Icon from "$lib/components/icon.svelte";
    import { goto } from "$app/navigation";
    import { Add } from "$lib/icons";
</script>

<main>
    <PageNavigation previousPage="/">
        <div class="nav-actions">
            <Button size="xs" title="Create invoice" onclick={() => goto("/invoice/create")}>
                <Icon path={Add} size="16" />
                <span>Create Invoice</span>
            </Button>
        </div>
    </PageNavigation>
</main>

<style>
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }
</style>
