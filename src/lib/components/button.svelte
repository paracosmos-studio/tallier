<!--
    SPDX-License-Identifier: GPL-3.0-only
    Copyright (C) 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    import type { HTMLButtonAttributes } from 'svelte/elements';

    type Props = HTMLButtonAttributes & {
        children: () => any;
        onclick: () => void;
        size?: 'xs' | 'sm' | 'md' | 'lg';
        bgColor?: string;
        fgColor?: string;
    }

    let {
        children,
        onclick,
        type = 'button',
        size = 'md',
        bgColor = 'var(--green)',
        fgColor = 'var(--color-background)',
        ...rest
    }: Props = $props();
</script>


<!--
    @component
    A customizable button component. Extra attributes (title, disabled,
    aria-*, event handlers) pass through to the native button.

    @param {() => any} children Content to display inside the button.
    @param {() => void} onclick Function to call on button click.
    @param {'button' | 'submit' | 'reset'} [type] Button type ('button', 'submit', 'reset').
    @param {'xs' | 'sm' | 'md' | 'lg'} [size] Size of the button ('xs', 'sm', 'md', 'lg').
    @param {string} [bgColor] Background color of the button.
    @param {string} [fgColor] Foreground (text) color of the button.
-->
<button
    {...rest}
    {onclick}
    {type}
    class={size}
    style="--btn-bg: {bgColor}; --btn-fg: {fgColor};"
>
    {@render children()}
</button>

<style>
    button {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        background-color: var(--btn-bg);
        color: var(--btn-fg);
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    button:hover {
        background-color: color-mix(in srgb, var(--btn-bg), white 10%);
    }

    button:disabled {
        background-color: var(--gray-50);
        color: var(--gray-30);
        cursor: not-allowed;
    }

    button.xs {
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
    }

    button.sm {
        padding: 0.45rem 0.8rem;
        font-size: 0.875rem;
    }

    button.md {
        padding: 0.6rem 1rem;
        font-size: 1rem;
    }

    button.lg {
        padding: 0.75rem 1.2rem;
        font-size: 1.125rem;
    }
</style>
