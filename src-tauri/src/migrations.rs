use tauri_plugin_sql::{Migration, MigrationKind};

pub(crate) fn load_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/20260119001_initial_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add project limit columns",
            sql: include_str!("../migrations/20260306001_project_limits.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add entry metadata columns",
            sql: include_str!("../migrations/20260307001_entry_metadata.sql"),
            kind: MigrationKind::Up,
        }
    ]
}
