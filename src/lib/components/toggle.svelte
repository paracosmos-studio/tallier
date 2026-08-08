<!--
    SPDX-License-Identifier: AGPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<script lang="ts">
    interface Props {
        checked?: boolean;
        disabled?: boolean;
        onchange?: (checked: boolean) => void
    };

    let { checked = $bindable(false), disabled = false, onchange }: Props = $props();

    function handleToggle() {
        if (disabled) return;
        checked = !checked;
        onchange?.(checked);
    }
</script>


<!--
    @component
    Animated toggle switch component with smooth transitions

    @param {boolean} checked - toggle state
    @param {boolean} [disabled=false] - when true, the toggle is non-interactive and dimmed
    @param {(checked: boolean) => void} [onchange] - callback when state changes

    @example
    <Toggle checked={enabled} onchange={(checked) => enabled = checked} />
-->
<button
    class="toggle"
    class:checked
    {disabled}
    onclick={handleToggle}
    type="button"
    aria-label="Toggle switch"
>
    <span class="slider"></span>
</button>

<style>
    .toggle {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 23px;
        background-color: var(--toggle-track-bg);
        border: none;
        border-radius: 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        padding: 0;
        outline: none;
        flex-shrink: 0;
        margin: 2px 0;
    }

    .toggle:hover {
        opacity: 0.9;
    }

    .toggle:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .toggle.checked {
        background-color: var(--green);
    }

    .slider {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 19px;
        height: 19px;
        background-color: var(--gray-30);
        border-radius: 50%;
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        pointer-events: none;
    }

    .toggle.checked .slider {
        background-color: var(--color-background);
        transform: translateX(25px);
    }
</style>
