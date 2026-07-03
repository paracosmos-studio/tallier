use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn format_elapsed(total: u64) -> String {
    format!("{:02}:{:02}:{:02}", total / 3600, (total % 3600) / 60, total % 60)
}

pub(crate) fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

// human-readable os name + version (e.g. "macOS 14.6.1"), stamped into export
// metadata by the frontend via `buildExportStamp`
#[tauri::command]
pub fn os_descriptor() -> String {
    let info = os_info::get();
    let name = match info.os_type() {
        os_info::Type::Macos => "macOS".to_string(),
        t => t.to_string(),
    };
    format!("{} {}", name, info.version())
}
