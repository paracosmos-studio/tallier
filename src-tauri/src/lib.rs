use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

fn load_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/20260119001_initial_schema.sql"),
            kind: MigrationKind::Up,
        }
        // add more migrations here as needed
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tally.db", load_migrations())
                .build()
        )
        //.invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}