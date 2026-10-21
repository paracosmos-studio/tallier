<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Square app icon. Shows the stored PNG when available, otherwise a
    two-letter badge derived from the app name or an explicit `badge`.
    Decorative: the adjacent text names the app.

    @param {string} name - app display name, used for the fallback initials.
    @param {string} [src] - png data uri of the stored icon.
    @param {string} [badge] - text to show instead of the computed initials.
    @param {number} [size=18] - width and height in pixels.
-->
<script lang="ts">
    import { appInitials } from "$lib/helpers/app-usage";

    type Props = {
        name: string;
        src?: string;
        badge?: string;
        size?: number;
    };

    let { name, src, badge, size = 18 }: Props = $props();
</script>

<span class="app-icon" style:--size="{size}px" aria-hidden="true">
    {#if src}
        <img {src} alt="" width={size} height={size} />
    {:else}
        <span class="badge">{badge ?? appInitials(name)}</span>
    {/if}
</span>

<style>
    .app-icon {
        display: inline-flex;
        width: var(--size);
        height: var(--size);
        flex-shrink: 0;
        border-radius: calc(var(--size) * 0.22);
        overflow: hidden;
    }

    img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: var(--gray-60);
        color: var(--gray-10);
        font-size: calc(var(--size) * 0.5);
        font-weight: 600;
        line-height: 1;
        letter-spacing: 0.01em;
    }
</style>
