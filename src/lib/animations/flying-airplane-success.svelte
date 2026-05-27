<!--
    @component
    One-shot "export success" animation: an outlined paper plane flies a figure-8,
    then a circle outline draws around the origin, a check appears, and the circle
    fills with the success color. Pure CSS keyframes on an inline SVG; no JS
    animation runtime.

    @param {number} [size=240] - square size of the rendered SVG, in px.
    @param {string} [duration="3s"] - total animation duration (any CSS time value).
    @param {boolean} [playing=true] - pause/play toggle (bindable).
    @param {boolean} [showControls=false] - show the built-in play/pause chip.
    @param {string} [label=""] - optional caption below the SVG; pass "" to hide.
    @param {string} [accentColor] - stroke color for the plane, outline ring, and check (defaults to `var(--yellow)`).
    @param {string} [successColor] - fill color for the success circle (defaults to `var(--green)`).
    @param {string} [knockoutColor] - color the check stroke turns to at the end so it appears cut out of the success fill (defaults to `var(--color-background)`).
-->
<script lang="ts">
    type Props = {
        size?: number;
        duration?: string;
        playing?: boolean;
        showControls?: boolean;
        label?: string;
        accentColor?: string;
        successColor?: string;
        knockoutColor?: string;
    };

    let {
        size = 240,
        duration = "3s",
        playing = $bindable(true),
        showControls = false,
        label = "",
        accentColor = "var(--yellow)",
        successColor = "var(--green)",
        knockoutColor = "var(--color-background)",
    }: Props = $props();

    function toggle(): void {
        playing = !playing;
    }
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
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- svg-native blur for the plane glow; css `filter: blur()` is
             flaky on svg primitives in webkit. -->
        <defs>
            <filter id="fa-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" />
            </filter>
        </defs>

        <!-- circle fill + outline, centered at (120, 120) -->
        <circle class="circle-bg" cx="120" cy="120" r="33" />
        <circle
            class="circle-outline"
            cx="120"
            cy="120"
            r="33"
            stroke-width="2.25"
            fill="none"
            transform="rotate(-90 120 120)"
            stroke-linecap="round"
        />

        <!-- plane group: parent centers it; child handles offset-path + scale + auto-rotation.
             plane is drawn with its tip at +x so auto-rotate aligns tip with path tangent. -->
        <g transform="translate(120 120)">
            <g class="plane-pos">
                <!-- soft glow trail -->
                <circle class="plane-glow" cx="0" cy="0" r="22" filter="url(#fa-glow)" />

                <!-- outlined plane -->
                <g class="plane-outline">
                    <path
                        d="M 30 0 L -22 -18 L -3 0 L -22 18 Z"
                        stroke-width="3.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        fill="none"
                    />
                    <path
                        d="M 30 0 L -3 0"
                        stroke-width="3.5"
                        stroke-linecap="round"
                        fill="none"
                    />
                </g>
            </g>
        </g>

        <!-- check icon, on top of the filled circle -->
        <g transform="translate(120 120)">
            <path
                class="check"
                d="M -11 0 L -3 9 L 13 -8"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            />
        </g>
    </svg>

    {#if label}
        <div class="label">{label}</div>
    {/if}

    {#if showControls}
        <div class="scrubber">
            <button onclick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {#if playing}
                    <svg width="10" height="10" viewBox="0 0 10 10">
                        <rect x="2" y="1.5" width="2" height="7" fill="currentColor" />
                        <rect x="6" y="1.5" width="2" height="7" fill="currentColor" />
                    </svg>
                {:else}
                    <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M2.5 1.5 L8.5 5 L2.5 8.5 Z" fill="currentColor" />
                    </svg>
                {/if}
            </button>
            <span>Loop · {duration}</span>
        </div>
    {/if}
</div>

<style>
    /* phase timeline (% of total duration):
         0-20    outlined plane idles at origin
        20-78    flies figure-8, scaling 0.5 -> 0.78
        78-84    circle outline draws
        84-90    plane fades, check draws (accent)
        90-96    circle fills success, check switches to knockout
        96-100   hold
    */
    .export-anim {
        --ease: cubic-bezier(0.45, 0.05, 0.55, 0.95);
        --ease-fly: cubic-bezier(0.76, 0, 0.24, 1);

        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        color: var(--gray-30);
        font-family: inherit;
    }

    .export-anim svg {
        width: var(--size);
        height: var(--size);
        display: block;
        overflow: visible;
    }

    .label {
        font-size: 11px;
        color: var(--gray-30);
        text-transform: uppercase;
        letter-spacing: 0.22em;
        opacity: 0;
        transform: translateY(4px);
        animation: labelIn var(--dur) var(--ease) forwards;
    }

    /* aligned with the check phase in the svg animations */
    @keyframes labelIn {
        0%,
        87% {
            opacity: 0;
            transform: translateY(4px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .scrubber {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: var(--gray-90);
        border: 1px solid var(--gray-90);
        border-radius: 999px;
        padding: 6px 14px 6px 6px;
        font-size: 11px;
        color: var(--gray-20);
    }

    .scrubber button {
        background: var(--gray-70);
        color: var(--gray-10);
        border: none;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        cursor: pointer;
        display: grid;
        place-items: center;
    }

    .scrubber button:hover {
        background: var(--gray-60);
    }

    /* pause every running animation when the host toggles off */
    .export-anim.paused :global(*),
    .export-anim.paused {
        animation-play-state: paused !important;
    }

    /* plane outline: visible from start through flight, fades for check */
    .plane-outline {
        animation: outlineLife var(--dur) var(--ease) forwards;
    }
    .plane-outline path {
        stroke: var(--anim-accent);
    }
    @keyframes outlineLife {
        0%,
        84% {
            opacity: 1;
        }
        88%,
        100% {
            opacity: 0;
        }
    }

    /* plane position + scale */
    .plane-pos {
        offset-path: path(
            "M 0 0 C 20 -34 55 -30 50 2 C 45 32 14 26 0 0 C -14 -28 -52 -32 -48 -2 C -44 28 -18 30 0 0"
        );
        offset-rotate: auto;
        offset-distance: 0%;
        transform-origin: 0 0;
        transform-box: view-box;
        animation: fly var(--dur) var(--ease-fly) forwards;
    }
    @keyframes fly {
        0%,
        14% {
            offset-distance: 0%;
            transform: scale(0.5);
        }
        20% {
            offset-distance: 0%;
            transform: scale(0.5);
        }
        78% {
            offset-distance: 100%;
            transform: scale(0.78);
        }
        100% {
            offset-distance: 100%;
            transform: scale(0.78);
        }
    }

    /* circle outline */
    .circle-outline {
        stroke-dasharray: 207; /* 2pi * 33 ~= 207 */
        stroke-dashoffset: 207;
        opacity: 0;
        animation: drawCircle var(--dur) var(--ease) forwards;
    }
    @keyframes drawCircle {
        0%,
        78% {
            stroke-dashoffset: 207;
            opacity: 0;
            stroke: var(--anim-accent);
        }
        79% {
            opacity: 1;
            stroke-dashoffset: 207;
            stroke: var(--anim-accent);
        }
        86% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-accent);
        }
        90% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-accent);
        }
        96%,
        100% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-success);
        }
    }

    /* circle fill */
    .circle-bg {
        fill: transparent;
        animation: fillCircle var(--dur) var(--ease) forwards;
    }
    @keyframes fillCircle {
        0%,
        90% {
            fill: transparent;
        }
        96%,
        100% {
            fill: var(--anim-success);
        }
    }

    /* check icon */
    .check {
        stroke-dasharray: 34;
        stroke-dashoffset: 34;
        opacity: 0;
        animation: checkLife var(--dur) var(--ease) forwards;
    }
    @keyframes checkLife {
        0%,
        86% {
            opacity: 0;
            stroke-dashoffset: 34;
            stroke: var(--anim-accent);
        }
        87% {
            opacity: 1;
            stroke-dashoffset: 34;
            stroke: var(--anim-accent);
        }
        92% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-accent);
        }
        96%,
        100% {
            opacity: 1;
            stroke-dashoffset: 0;
            stroke: var(--anim-knockout);
        }
    }

    /* plane glow trail */
    .plane-glow {
        fill: var(--anim-accent);
        opacity: 0;
        animation: glowLife var(--dur) var(--ease) forwards;
    }
    @keyframes glowLife {
        0%,
        22% {
            opacity: 0;
        }
        40% {
            opacity: 0.18;
        }
        70% {
            opacity: 0.22;
        }
        80%,
        100% {
            opacity: 0;
        }
    }
</style>
