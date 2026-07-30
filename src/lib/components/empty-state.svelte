<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Centered empty-state with a circular icon, heading, description, and an
    optional call-to-action button.

    @param {string} icon - SVG path string from `$lib/icons`.
    @param {string} title - heading text.
    @param {string} description - subtext shown beneath the heading.
    @param {string} [actionLabel] - label for the call-to-action button.
    @param {string} [actionIcon] - SVG path for the action button icon.
    @param {() => void} [onaction] - click handler for the action button.
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import Button from "$lib/components/button.svelte";

    type Props = {
        icon: string;
        title: string;
        description: string;
        actionLabel?: string;
        actionIcon?: string;
        onaction?: () => void;
    };

    let { icon, title, description, actionLabel, actionIcon, onaction }: Props = $props();
</script>

<div class="empty-state">
    <div class="icon-circle">
        <Icon path={icon} size="34" fill="var(--gray-20)" />
    </div>
    <h2>{title}</h2>
    <p>{description}</p>
    {#if actionLabel && onaction}
        <div class="action">
            <Button size="sm" onclick={onaction}>
                {#if actionIcon}
                    <Icon path={actionIcon} size="16" fill="var(--color-background)" />
                {/if}
                <span>{actionLabel}</span>
            </Button>
        </div>
    {/if}
</div>

<style>
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 40px 20px;
        gap: 14px;
    }

    .icon-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--gray-80);
        margin-bottom: 4px;
    }

    h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--gray-10);
    }

    p {
        margin: 0;
        max-width: 320px;
        font-size: 0.82rem;
        line-height: 1.5;
        color: var(--gray-30);
    }

    .action {
        margin-top: 6px;
    }
</style>
