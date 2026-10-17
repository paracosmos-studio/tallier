// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";
import { normalizeHex } from "$lib/helpers/colors";

// minimal shape of the chromium eyedropper api (webview2); absent from lib.dom
interface EyeDropperApi {
    open(): Promise<{ sRGBHex: string }>;
}

type EyeDropperCtor = new () => EyeDropperApi;

function eyeDropper(): EyeDropperCtor | undefined {
    return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
}

let supported: Promise<boolean> | undefined;

/**
 * Whether a screen color sampler exists: the web eyedropper on windows,
 * the native `NSColorSampler` on macos.
 */
export function colorSamplerSupported(): Promise<boolean> {
    supported ??= eyeDropper()
        ? Promise.resolve(true)
        : invoke<boolean>("color_sampler_supported").catch(() => false);
    return supported;
}

/**
 * Lets the user pick a pixel anywhere on screen. Resolves to `#RRGGBB`, or
 * null when cancelled or unsupported.
 */
export async function sampleScreenColor(): Promise<string | null> {
    const Ctor: EyeDropperCtor | undefined = eyeDropper();
    const hex: string | null = Ctor
        ? await new Ctor().open().then((r) => r.sRGBHex, () => null)
        : await invoke<string | null>("sample_screen_color").catch(() => null);
    return hex ? normalizeHex(hex) : null;
}
