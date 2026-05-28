use tauri_plugin_sql::{Migration, MigrationKind};

pub(crate) fn load_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/202605281332_initial_schema.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
