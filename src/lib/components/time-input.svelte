<!--
    SPDX-License-Identifier: GPL-3.0-only
    SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.
-->
<!--
    @component
    Text input masked for duration in HH:MM:SS format (24-hour).
    Colons are fixed at positions 2 and 5. Digits overwrite in place.

    @param {string} name - input name attribute.
    @param {string} [value='00:00:00'] - current value in HH:MM:SS format.
    @param {string} [min='00:00:00'] - minimum allowed value in HH:MM:SS format.
    @param {string} [max='99:59:59'] - maximum allowed value in HH:MM:SS format.
    @param {boolean} [disabled=false] - whether the input is disabled.
-->
<script lang="ts">
    interface Props {
        name: string;
        value?: string;
        min?: string;
        max?: string;
        disabled?: boolean;
    }

    const COLONS = new Set([2, 5]);
    const DIGIT_POSITIONS = [0, 1, 3, 4, 6, 7];

    let { name, value = $bindable('00:00:00'), min = '00:00:00', max = '99:59:59', disabled = false }: Props = $props();

    function toSeconds(v: string): number {
        const [h, m, s] = v.split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }

    function clamp(v: string): string {
        const secs = toSeconds(v);
        const clamped = Math.min(Math.max(toSeconds(min), secs), toSeconds(max));
        return format(clamped);
    }

    function format(total: number): string {
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function nextDigitPos(pos: number): number {
        for (const p of DIGIT_POSITIONS) {
            if (p > pos) return p;
        }
        return -1;
    }

    function prevDigitPos(pos: number): number {
        for (let i = DIGIT_POSITIONS.length - 1; i >= 0; i--) {
            if (DIGIT_POSITIONS[i] < pos) return DIGIT_POSITIONS[i];
        }
        return -1;
    }

    function handleKeydown(e: KeyboardEvent) {
        const input = e.currentTarget as HTMLInputElement;
        const pos = input.selectionStart ?? 0;

        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            let target = COLONS.has(pos) ? pos + 1 : pos;
            if (target > 7) return;

            const chars = value.split('');
            chars[target] = e.key;
            value = clamp(chars.join(''));

            const next = nextDigitPos(target);
            requestAnimationFrame(() => {
                const p = next === -1 ? target + 1 : next;
                input.setSelectionRange(p, p);
            });
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            const target = COLONS.has(pos - 1) ? pos - 2 : pos - 1;
            if (target < 0) return;

            const chars = value.split('');
            chars[target] = '0';
            value = clamp(chars.join(''));

            requestAnimationFrame(() => input.setSelectionRange(target, target));
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            const target = COLONS.has(pos) ? pos + 1 : pos;
            if (target > 7) return;

            const chars = value.split('');
            chars[target] = '0';
            value = clamp(chars.join(''));

            requestAnimationFrame(() => input.setSelectionRange(target, target));
            return;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const delta = e.key === 'ArrowUp' ? 10 : -10;
            value = clamp(format(toSeconds(value) + delta));
            requestAnimationFrame(() => input.setSelectionRange(pos, pos));
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = prevDigitPos(pos);
            if (prev !== -1) input.setSelectionRange(prev, prev);
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = nextDigitPos(pos);
            if (next !== -1) input.setSelectionRange(next, next);
            return;
        }

        if (e.key === 'Home') {
            e.preventDefault();
            input.setSelectionRange(0, 0);
            return;
        }

        if (e.key === 'End') {
            e.preventDefault();
            input.setSelectionRange(8, 8);
            return;
        }

        if (e.key === 'Tab' || e.key === 'Escape') return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'a' || e.key === 'c') return;
        }

        e.preventDefault();
    }

    function handlePaste(e: ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData?.getData('text') ?? '';
        const digits = pasted.replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
        value = clamp(`${digits[0]}${digits[1]}:${digits[2]}${digits[3]}:${digits[4]}${digits[5]}`);
    }

    function handleBlur() {
        value = clamp(value);
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
    }
</script>

<input
    type="text"
    {name}
    {value}
    {disabled}
    class:zero={value === '00:00:00'}
    maxlength="8"
    onkeydown={handleKeydown}
    onblur={handleBlur}
    onpaste={handlePaste}
    ondrop={handleDrop}
/>

<style>
    input {
        padding: 0.25rem;
        border: 1px solid var(--gray-70);
        border-radius: 5px;
        background-color: var(--gray-90);
        color: var(--gray-10);
        width: 64px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        outline: none;
        font-size: 0.8rem;
    }

    input.zero {
        color: var(--gray-30);
    }

    input:focus {
        border-color: var(--gray-50);
    }

    input:disabled {
        background-color: var(--gray-80);
        color: var(--gray-50);
        cursor: not-allowed;
    }
</style>
