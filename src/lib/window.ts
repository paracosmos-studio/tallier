// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Paracosmos Studio Inc.

import { invoke } from '@tauri-apps/api/core';

export type WindowProfile = 'compact' | 'wide';

/**
 * Applies a named window profile (size, bounds, resizable) in a single
 * atomic Rust call. Owned by the layout, never by individual pages.
 */
async function applyWindowProfile(name: WindowProfile): Promise<void> {
    await invoke('set_window_profile', { name });
}

/**
 * Adjusts the height of the compact window (e.g. when a dropdown grows).
 * No-op if the active profile is not compact.
 */
async function setCompactHeight(px: number): Promise<void> {
    await invoke('set_compact_height', { px });
}

export { applyWindowProfile, setCompactHeight };
