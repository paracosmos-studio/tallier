<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import Footer from "$lib/components/footer.svelte";

    import { Play } from "$lib/icons";
    import { setCurrentWindowSize } from "$lib/window";
    import { onMount } from "svelte";

    onMount(async () => {
        await setCurrentWindowSize(400, 400);
    });
</script>

<main>
    <PageNavigation previousPage="/" />
    <a href="/projects" class="manage-projects">
        <span>Manage Projects</span>
        <Icon path={Play} size="24" fill="currentColor" />
    </a>
</main>
<Footer />

<style>
    .manage-projects {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--yellow);
        border-radius: 5px;
        padding: 0.45rem 1rem;
        color: var(--gray-90);
        text-decoration: none;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
        transition: opacity 0.2s ease;
    }

    .manage-projects:hover {
        text-decoration: none;
        opacity: 0.9;
    }
</style>