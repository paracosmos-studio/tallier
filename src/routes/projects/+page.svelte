<script lang="ts">
  import Button from "$lib/components/button.svelte";
    import PageNavigation from "$lib/components/page-navigation.svelte";
</script>

<main>
    <PageNavigation previousPage="/settings">
        <Button
            size="xs"
            title="Add New Project"
            onclick={() => {}}
        >
            + Add New
        </Button>
    </PageNavigation>

    <p>Projects</p>


</main>

<style>

</style>