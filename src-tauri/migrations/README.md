# Database Migrations

This directory contains SQL migration files for the Tallier application.

## Naming Convention

Migrations should follow the pattern: `YYYYMMDDHHMM_description.sql`
- `YYYYMMDD`: Date of the migration (e.g., 20240427 for April 27, 2024)
- `HHMM`: Time of the migration (e.g., 0930 for 9:30 AM)
- `description`: Brief description with underscores

Examples:
- `202404270930_create_users.sql`
- `202404271345_create_projects.sql`
- `202404271156_add_user_email.sql`

## Adding New Migrations

1. Create a new `.sql` file with the next version number
2. Write your SQL migration code
3. Add the migration to `src/lib.rs` in the `load_migrations()` function:

```rust
Migration {
    version: 2,  // Increment version
    description: "create projects table",
    sql: include_str!("../migrations/202404271345_create_projects.sql"),
    kind: MigrationKind::Up,
},
```

## Important Notes

- Migrations run automatically when the app starts
- Version numbers must be sequential
- Never modify existing migration files after they've been deployed
- To make schema changes, create a new migration file
- The `include_str!` macro embeds SQL at compile time (no runtime file access needed)

## Migration State

Tauri's SQL plugin tracks which migrations have been applied in the database itself, so migrations only run once.
