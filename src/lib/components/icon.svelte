<script lang="ts">
    interface Props {
        path: string;
        size?: string;
        fill?: string;
    }

    let { path, size = "24", fill = "#000" }: Props = $props();
</script>

<!--
    @component
    Custom SVG icon component.

    @param {string} path - The path of icon to display. Import paths from $lib/icons.ts.
    @param {string} [size="24"] - The width and height of the icon in pixels. Defaults to "24".
    @param {string} [fill="#000"] - The fill color of the icon. Defaults to black ("#000").
-->
<svg
    fill={fill}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    xmlns="http://www.w3.org/2000/svg"
    class="svg-icon"
>
    <path d={path} />
</svg>

<style>
    .svg-icon {
        position: relative;
        display: inline-block;
        pointer-events: none;
    }
</style>
