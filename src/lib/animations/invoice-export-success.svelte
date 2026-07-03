<!--
    @component
    One-shot "invoice export success" animation: time-entry chips drop into an
    open-top box, the box collapses into an up arrow that rises and vanishes
    into a circle outline, which fills bottom-up with the success color while
    a dollar sign pops in and turns into a check. Pure CSS keyframes on an
    inline SVG; no JS animation runtime. Plays once and holds the final frame.

    @param {number} [size=240] - square size of the rendered SVG, in px.
    @param {string} [duration="3.5s"] - total animation duration (any CSS time value).
    @param {boolean} [playing=true] - pause/play toggle (bindable).
    @param {string} [accentColor] - stroke color for the box, arrow, and circle outline (defaults to `var(--yellow)`).
    @param {string} [successColor] - fill color for the success circle (defaults to `var(--green)`).
    @param {string} [knockoutColor] - color of the dollar sign and check inside the success fill (defaults to `var(--color-background)`).
-->
<script lang="ts">
    type Props = {
        size?: number;
        duration?: string;
        playing?: boolean;
        accentColor?: string;
        successColor?: string;
        knockoutColor?: string;
    };

    let {
        size = 240,
        duration = "3.5s",
        playing = $bindable(true),
        accentColor = "var(--yellow)",
        successColor = "var(--green)",
        knockoutColor = "var(--color-background)",
    }: Props = $props();
</script>

<div
    class="export-anim"
    class:paused={!playing}
    style="
        --size: {size}px;
        --dur: {duration};
        --anim-accent: {accentColor};
        --anim-success: {successColor};
        --anim-knockout: {knockoutColor};
    "
>
    <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Invoice exported successfully"
    >
        <defs>
            <clipPath id="ies-fill-clip">
                <circle cx="120" cy="120" r="31" />
            </clipPath>
        </defs>

        <!-- time-entry chips: parent places, child animates around local origin -->
        <g transform="translate(52 47)">
            <g class="chip chip-1">
                <rect class="chip-box" x="-29" y="-12" width="58" height="24" rx="7" />
                <text class="chip-text" text-anchor="middle" dominant-baseline="central">
                    01:43:22
                </text>
            </g>
        </g>
        <g transform="translate(120 47)">
            <g class="chip chip-2">
                <rect class="chip-box" x="-29" y="-12" width="58" height="24" rx="7" />
                <text class="chip-text" text-anchor="middle" dominant-baseline="central">
                    00:17:54
                </text>
            </g>
        </g>
        <g transform="translate(188 47)">
            <g class="chip chip-3">
                <rect class="chip-box" x="-29" y="-12" width="58" height="24" rx="7" />
                <text class="chip-text" text-anchor="middle" dominant-baseline="central">
                    02:05:36
                </text>
            </g>
        </g>

        <!-- open-top box the chips fall into -->
        <path
            class="box"
            d="M 83 129 L 83 167 Q 83 175 91 175 L 149 175 Q 157 175 157 167 L 157 129"
            stroke-width="3.5"
            stroke-linecap="round"
        />

        <!-- up arrow, born at the box center -->
        <g transform="translate(120 152)">
            <g class="arrow">
                <path
                    d="M 0 14 L 0 -13 M -10 -3 L 0 -14 L 10 -3"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
        </g>

        <!-- success circle, rising fill, dollar and check -->
        <g>
            <g clip-path="url(#ies-fill-clip)">
                <rect class="fill-rise" x="87" y="87" width="66" height="66" />
            </g>
            <circle
                class="circle-outline"
                cx="120"
                cy="120"
                r="33"
                stroke-width="4.25"
                transform="rotate(-90 120 120)"
                stroke-linecap="round"
            />
            <g transform="translate(120 120)">
                <text class="dollar" text-anchor="middle" dominant-baseline="central">$</text>
                <path
                    class="check"
                    d="M -11 0 L -3 9 L 13 -8"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
        </g>
    </svg>
</div>

<style>
    /* phase timeline (% of total duration):
         0-8     chips and box pop in
         8-35    chips drop into the box one by one, box pulses on each catch
        36-42    box collapses into the arrow
        42-57    arrow rises and shrinks away at the circle center
        54-63    circle outline draws
        65-74    fill rises, dollar pops in
        79-90    dollar swaps for the check
        90-100   hold
    */
    .export-anim {
        --ease: cubic-bezier(0.45, 0.05, 0.55, 0.95);
        --ease-in: cubic-bezier(0.5, 0, 0.75, 0.4);
        --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

        display: inline-flex;
        font-family: inherit;
    }

    .export-anim svg {
        width: var(--size);
        height: var(--size);
        display: block;
        overflow: visible;
    }

    .export-anim.paused :global(*),
    .export-anim.paused {
        animation-play-state: paused !important;
    }

    .chip-box {
        fill: var(--gray-80);
        stroke: var(--gray-50);
        stroke-width: 1.5;
    }

    .chip-text {
        fill: var(--gray-10);
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 10px;
        letter-spacing: 0.03em;
    }

    .chip {
        opacity: 0;
        transform-origin: 0 0;
        transform-box: view-box;
    }

    .chip-1 {
        animation: chip1 var(--dur) var(--ease) forwards;
    }

    .chip-2 {
        animation: chip2 var(--dur) var(--ease) forwards;
    }

    .chip-3 {
        animation: chip3 var(--dur) var(--ease) forwards;
    }

    @keyframes chip1 {
        0% {
            opacity: 0;
            transform: translateY(-6px);
        }
        4%,
        10% {
            opacity: 1;
            transform: none;
            animation-timing-function: var(--ease-in);
        }
        15% {
            transform: translate(45px, 37px) rotate(-6deg) scale(0.85);
            animation-timing-function: var(--ease-in);
        }
        17.5% {
            opacity: 1;
        }
        20.5%,
        100% {
            opacity: 0;
            transform: translate(68px, 105px) scale(0.45);
        }
    }

    @keyframes chip2 {
        0%,
        2% {
            opacity: 0;
            transform: translateY(-6px);
        }
        6%,
        17% {
            opacity: 1;
            transform: none;
            animation-timing-function: var(--ease-in);
        }
        22% {
            transform: translate(0, 37px) scale(0.85);
            animation-timing-function: var(--ease-in);
        }
        24.5% {
            opacity: 1;
        }
        27.5%,
        100% {
            opacity: 0;
            transform: translate(0, 105px) scale(0.45);
        }
    }

    @keyframes chip3 {
        0%,
        4% {
            opacity: 0;
            transform: translateY(-6px);
        }
        8%,
        24% {
            opacity: 1;
            transform: none;
            animation-timing-function: var(--ease-in);
        }
        29% {
            transform: translate(-45px, 37px) rotate(6deg) scale(0.85);
            animation-timing-function: var(--ease-in);
        }
        31.5% {
            opacity: 1;
        }
        34.5%,
        100% {
            opacity: 0;
            transform: translate(-68px, 105px) scale(0.45);
        }
    }

    /* box: pops in with the chips, squashes on each catch, collapses into the arrow */
    .box {
        stroke: var(--anim-accent);
        opacity: 0;
        transform-origin: 120px 175px;
        transform-box: view-box;
        animation: boxLife var(--dur) var(--ease) forwards;
    }

    @keyframes boxLife {
        0% {
            opacity: 0;
            transform: translateY(8px);
        }
        5%,
        19.5% {
            opacity: 1;
            transform: none;
        }
        21% {
            transform: scale(1.06, 0.94);
        }
        22.5%,
        26.5% {
            transform: none;
        }
        28% {
            transform: scale(1.06, 0.94);
        }
        29.5%,
        33.5% {
            transform: none;
        }
        35% {
            transform: scale(1.07, 0.93);
        }
        36.5% {
            opacity: 1;
            transform: none;
            animation-timing-function: var(--ease-in);
        }
        41.5%,
        100% {
            opacity: 0;
            transform: scale(0.55);
        }
    }

    .arrow {
        opacity: 0;
        transform-origin: 0 0;
        transform-box: view-box;
        animation: arrowLife var(--dur) var(--ease) forwards;
    }

    .arrow path {
        stroke: var(--anim-accent);
    }

    @keyframes arrowLife {
        0%,
        39% {
            opacity: 0;
            transform: scale(0.35);
            animation-timing-function: var(--ease-out);
        }
        44.5% {
            opacity: 1;
            transform: scale(1);
            animation-timing-function: var(--ease-out);
        }
        52% {
            opacity: 1;
            transform: translateY(-32px) scale(1);
        }
        57%,
        100% {
            opacity: 0;
            transform: translateY(-32px) scale(0.2);
        }
    }

    .circle-outline {
        stroke-dasharray: 208;
        stroke-dashoffset: 208;
        opacity: 0;
        animation: drawCircle var(--dur) var(--ease) forwards;
    }

    @keyframes drawCircle {
        0%,
        53% {
            opacity: 0;
            stroke-dashoffset: 208;
            stroke: var(--anim-accent);
        }
        54% {
            opacity: 1;
            stroke-dashoffset: 208;
            stroke: var(--anim-accent);
        }
        63% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-accent);
        }
        67% {
            stroke: var(--anim-accent);
        }
        75%,
        100% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-success);
        }
    }

    .fill-rise {
        fill: var(--anim-success);
        transform: translateY(68px);
        animation: fillRise var(--dur) var(--ease-out) forwards;
    }

    @keyframes fillRise {
        0%,
        65% {
            transform: translateY(68px);
        }
        74%,
        100% {
            transform: translateY(0);
        }
    }

    .dollar {
        fill: var(--anim-knockout);
        font-size: 32px;
        font-weight: 700;
        opacity: 0;
        transform-origin: 0 0;
        transform-box: view-box;
        animation: dollarLife var(--dur) var(--ease) forwards;
    }

    @keyframes dollarLife {
        0%,
        67% {
            opacity: 0;
            transform: scale(0.4);
            animation-timing-function: var(--ease-out);
        }
        72% {
            opacity: 1;
            transform: scale(1.1);
        }
        74.5%,
        79% {
            opacity: 1;
            transform: scale(1);
        }
        83%,
        100% {
            opacity: 0;
            transform: scale(1.35);
        }
    }

    .check {
        stroke: var(--anim-knockout);
        stroke-dasharray: 36;
        stroke-dashoffset: 36;
        opacity: 0;
        animation: checkLife var(--dur) var(--ease) forwards;
    }

    @keyframes checkLife {
        0%,
        82.5% {
            opacity: 0;
            stroke-dashoffset: 36;
        }
        83.5% {
            opacity: 1;
            stroke-dashoffset: 36;
        }
        90%,
        100% {
            opacity: 1;
            stroke-dashoffset: 0;
        }
    }

    /* static final frame instead of motion */
    @media (prefers-reduced-motion: reduce) {
        .export-anim :is(.chip, .box, .arrow, .dollar) {
            animation: none;
            opacity: 0;
        }

        .export-anim .circle-outline {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-success);
        }

        .export-anim .fill-rise {
            animation: none;
            transform: none;
        }

        .export-anim .check {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
        }
    }
</style>
