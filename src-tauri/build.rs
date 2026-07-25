// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

fn main() {
    // the updater capability references permissions from plugins that only
    // exist when the `updater` feature is on; including it in an App Store
    // build (--no-default-features) would fail ACL resolution.
    if std::env::var_os("CARGO_FEATURE_UPDATER").is_none() {
        let attrs = tauri_build::Attributes::new()
            .capabilities_path_pattern("./capabilities/default.json");
        tauri_build::try_build(attrs).expect("failed to run tauri-build");
    } else {
        tauri_build::build()
    }
}
