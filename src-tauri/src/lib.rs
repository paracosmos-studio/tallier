mod files;
mod migrations;
mod tray;
mod util;
mod window;

use migrations::load_migrations;
use tray::TrayState;
use window::{WindowProfile, WindowProfileState, apply_window_profile};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TrayState::new())
        .manage(WindowProfileState::new(WindowProfile::Compact))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tallier.db", load_migrations())
                .build()
        )
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
