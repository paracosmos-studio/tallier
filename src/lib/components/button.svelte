<script lang="ts">
    type Props = {
        children: () => any;
        onclick: () => void;
        onkeydown?: (event: KeyboardEvent) => void;
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
        title?: string;
        size?: 'xs' | 'sm' | 'md' | 'lg';
        bgColor?: string;
        fgColor?: string;
    }

    let {
        children,
        onclick,
        onkeydown,
        disabled = false,
        type = 'button',
        title = '',
        size = 'md',
        bgColor = 'var(--green)',
        fgColor = 'var(--color-background)',
    }: Props = $props();
</script>


<!--
    @component
    A customizable button component.

    @param {() => any} children Content to display inside the button.
    @param {() => void} [onclick] Function to call on button click.
    @param {(event: KeyboardEvent) => void} [onkeydown] Function to call on keydown event.
    @param {boolean} [disabled] Boolean to disable the button.
    @param {'button' | 'submit' | 'reset'} [type] Button type ('button', 'submit', 'reset').
    @param {string} [title] Tooltip text for the button.
    @param {'xs' | 'sm' | 'md' | 'lg'} [size] Size of the button ('xs', 'sm', 'md', 'lg').
    @param {string} [bgColor] Background color of the button.
    @param {string} [fgColor] Foreground (text) color of the button.
-->
<button
    {onclick}
    {onkeydown}
    {disabled}
    {type}
    {title}
    class={size}
    style="background-color: {bgColor}; color: {fgColor};"
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
        font-family: 'Instrument Sans', sans-serif;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    button:hover {
        filter: brightness(1.1);
    }

    button:disabled {
        background-color: var(--gray-50);
        color: var(--gray-30);
        cursor: not-allowed;
        filter: none;
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
