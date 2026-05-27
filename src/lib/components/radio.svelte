<!--
    @component
    Single radio button with a visible label. Use individually, or compose
    multiple sharing the same `name` to form a group; see `radio-group.svelte`
    for rendering from an options array.

    @param {string} name - shared name attribute used to group radios natively.
    @param {string} value - this radio's value.
    @param {string} groupValue - currently selected value of the group (bindable).
    @param {string} label - display label shown next to the indicator.
    @param {boolean} [disabled=false]
    @param {'sm' | 'md'} [size="md"]
    @param {(value: string) => void} [onchange] - fires when this radio becomes selected.
-->
<script lang="ts">
    type Props = {
        name: string;
        value: string;
        groupValue: string;
        label: string;
        disabled?: boolean;
        size?: 'sm' | 'md';
        onchange?: (value: string) => void;
    };

    let {
        name,
        value,
        groupValue = $bindable(),
        label,
        disabled = false,
        size = 'md',
        onchange,
    }: Props = $props();

    function handleChange(): void {
        if (disabled) return;
        groupValue = value;
        onchange?.(value);
    }
</script>

<label class={`radio ${size}`} class:disabled>
    <input
        type="radio"
        {name}
        {value}
        checked={groupValue === value}
        {disabled}
        onchange={handleChange}
    />
    <span class="indicator" aria-hidden="true"></span>
    <span class="label-text">{label}</span>
</label>

<style>
    .radio {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: var(--gray-10);
        user-select: none;
        -webkit-user-select: none;
    }

    .radio.disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    .radio.sm {
        font-size: 0.78rem;
    }

    .radio.md {
        font-size: 0.85rem;
    }

    /* visually hide native input but keep it accessible */
    input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .indicator {
        flex-shrink: 0;
        width: 14px;
        height: 14px;
        border: 1.5px solid var(--gray-50);
        border-radius: 50%;
        background: var(--gray-90);
        box-sizing: border-box;
        position: relative;
        transition: border-color 0.15s ease;
    }

    .radio.sm .indicator {
        width: 12px;
        height: 12px;
    }

    .radio:hover:not(.disabled) .indicator {
        border-color: var(--gray-30);
    }

    input:focus-visible + .indicator {
        outline: 2px solid var(--green);
        outline-offset: 2px;
    }

    input:checked + .indicator {
        border-color: var(--green);
    }

    input:checked + .indicator::after {
        content: "";
        position: absolute;
        inset: 2px;
        background: var(--green);
        border-radius: 50%;
    }
</style>
