// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { invoke } from "@tauri-apps/api/core";

/**
 * Joins a directory and filename with a single forward slash, trimming any
 * trailing separators on the directory.
 *
 * @param dir - Destination directory.
 * @param file - Filename to append.
 */
export function joinPath(dir: string, file: string): string {
  return `${dir.replace(/[\\/]+$/, "")}/${file}`;
}

/**
 * Checks whether a path already exists on disk. A leading `~/` is expanded
 * server-side by the `path_exists` Tauri command.
 *
 * @param path - Absolute or tilde-prefixed path to test.
 */
export async function pathExists(path: string): Promise<boolean> {
  return await invoke<boolean>("path_exists", { path });
}
