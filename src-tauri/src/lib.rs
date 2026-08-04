// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

mod files;
mod invoice;
mod migrations;
mod tray;
mod util;
mod window;

use migrations::load_migrations;
use tray::TrayState;
use window::{WindowProfile, WindowProfileState, apply_window_profile};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg_attr(not(feature = "updater"), allow(unused_mut))]
    let mut builder = tauri::Builder::default()
        .manage(TrayState::new())
        .manage(WindowProfileState::new(WindowProfile::Compact))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tallier.db", load_migrations())
                .build()
        );

    // App Store builds must not self-update; the webview probes the variant
    // via `util::updater_available`.
    #[cfg(feature = "updater")]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .setup(|app| {
            // source of truth for window bounds lives in WindowProfile.
            // re-apply at boot so tauri.conf.json drift cannot desync.
            let _ = apply_window_profile(&app.handle(), WindowProfile::Compact);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tray::set_tray_timer,
            tray::set_tray_show_title,
            tray::set_tray_auto_pause,
            window::set_window_profile,
            window::set_compact_height,
            files::path_exists,
            files::write_text_file,
            files::write_file,
            files::save_avatar,
            files::delete_avatar,
            files::read_avatar,
            invoice::render_invoice_pdf,
            invoice::render_invoice_svg,
            util::os_descriptor,
            util::updater_available,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
