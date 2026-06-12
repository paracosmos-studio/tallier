<!--
    @component
    Square client avatar. Renders the profile image when present, otherwise a
    Person icon placeholder on the shared card background. `src` is a stored
    avatar filename, resolved to an asset URL.

    @param {string | null} [src] - Stored avatar filename.
    @param {number} [size=36] - Side length in pixels.
    @param {string} [name] - Contact name, used as image alt text.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import { Person } from "$lib/icons";
    import { avatarSrc } from "$lib/helpers/clients";

    type Props = {
        src?: string | null;
        size?: number;
        name?: string;
    };

    let { src, size = 36, name = "" }: Props = $props();

    let url: string | null = $state(null);

    // stored filename resolves to an asset URL
    $effect(() => {
        const value = src;
        if (!value) { url = null; return; }
        let active = true;
        avatarSrc(value)
            .then((resolved) => { if (active) url = resolved; })
            .catch(() => { if (active) url = null; });
        return () => { active = false; };
    });
</script>

<span class="avatar" style="--size: {size}px">
    {#if url}
        <img src={url} alt={name} />
    {:else}
        <Icon path={Person} size={String(Math.round(size * 0.6))} fill="var(--gray-50)" />
    {/if}
</span>

<style>
    .avatar {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--size);
        height: var(--size);
        border-radius: 6px;
        overflow: hidden;
        background-color: var(--color-background);
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
</style>
