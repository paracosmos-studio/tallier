// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! persistence for `app_usage` / `app_icons`. the tracker talks to the `Store`
//! trait so its state machine is testable with an in-memory impl; production
//! uses `SqliteStore`, a clone of the pool `tauri-plugin-sql` opened for the
//! webview, so both sides share one connection pool.

use sqlx::{Pool, Row, Sqlite};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Kind {
    Active,
    Idle,
    Unknown,
}

impl Kind {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Kind::Active => "active",
            Kind::Idle => "idle",
            Kind::Unknown => "unknown",
        }
    }
}

pub(crate) trait Store {
    /// opens a segment; `last_seen_at` starts equal to `started_at`
    fn insert_segment(&mut self, timer_id: i64, kind: Kind, app_id: &str, app_name: &str, started_at: i64) -> Result<i64, String>;
    /// sets `ended_at` and `last_seen_at`
    fn close_segment(&mut self, id: i64, ended_at: i64) -> Result<(), String>;
    fn heartbeat(&mut self, id: i64, at: i64) -> Result<(), String>;
    fn icon_captured_at(&mut self, app_id: &str) -> Result<Option<i64>, String>;
    fn upsert_icon(&mut self, app_id: &str, png: Option<&[u8]>, size: i64, captured_at: i64) -> Result<(), String>;
    /// closes every open row at its heartbeat. only one timer runs at a time,
    /// so any open row when tracking starts is a leftover from a crash.
    fn sweep_open(&mut self) -> Result<(), String>;
}

pub(crate) struct SqliteStore {
    pool: Pool<Sqlite>,
}

impl SqliteStore {
    pub(crate) fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }
}

fn db_err(e: sqlx::Error) -> String {
    e.to_string()
}

impl Store for SqliteStore {
    fn insert_segment(&mut self, timer_id: i64, kind: Kind, app_id: &str, app_name: &str, started_at: i64) -> Result<i64, String> {
        let result = tauri::async_runtime::block_on(
            sqlx::query(
                "INSERT INTO app_usage (timer_id, kind, app_id, app_name, started_at, last_seen_at) \
                 VALUES ($1, $2, $3, $4, $5, $5)",
            )
            .bind(timer_id)
            .bind(kind.as_str())
            .bind(app_id)
            .bind(app_name)
            .bind(started_at)
            .execute(&self.pool),
        )
        .map_err(db_err)?;
        Ok(result.last_insert_rowid())
    }

    fn close_segment(&mut self, id: i64, ended_at: i64) -> Result<(), String> {
        tauri::async_runtime::block_on(
            sqlx::query("UPDATE app_usage SET ended_at = $2, last_seen_at = $2 WHERE id = $1")
                .bind(id)
                .bind(ended_at)
                .execute(&self.pool),
        )
        .map(|_| ())
        .map_err(db_err)
    }

    fn heartbeat(&mut self, id: i64, at: i64) -> Result<(), String> {
        tauri::async_runtime::block_on(
            sqlx::query("UPDATE app_usage SET last_seen_at = $2 WHERE id = $1 AND ended_at IS NULL")
                .bind(id)
                .bind(at)
                .execute(&self.pool),
        )
        .map(|_| ())
        .map_err(db_err)
    }

    fn icon_captured_at(&mut self, app_id: &str) -> Result<Option<i64>, String> {
        let row = tauri::async_runtime::block_on(
            sqlx::query("SELECT captured_at FROM app_icons WHERE app_id = $1")
                .bind(app_id)
                .fetch_optional(&self.pool),
        )
        .map_err(db_err)?;
        row.map(|r| r.try_get::<i64, _>(0).map_err(db_err)).transpose()
    }

    fn upsert_icon(&mut self, app_id: &str, png: Option<&[u8]>, size: i64, captured_at: i64) -> Result<(), String> {
        tauri::async_runtime::block_on(
            sqlx::query("INSERT OR REPLACE INTO app_icons (app_id, icon_png, size, captured_at) VALUES ($1, $2, $3, $4)")
                .bind(app_id)
                .bind(png)
                .bind(size)
                .bind(captured_at)
                .execute(&self.pool),
        )
        .map(|_| ())
        .map_err(db_err)
    }

    fn sweep_open(&mut self) -> Result<(), String> {
        tauri::async_runtime::block_on(
            sqlx::query("UPDATE app_usage SET ended_at = last_seen_at WHERE ended_at IS NULL").execute(&self.pool),
        )
        .map(|_| ())
        .map_err(db_err)
    }
}

/// final write when tracking stops: every row of `timer_id` ends at `end`, and
/// rows that began at or after `end` are dropped. with auto-pause the webview
/// reports a pre-sleep end after the tracker has already logged the sleep and
/// the wake, so the clamp must not depend on who noticed first. async because
/// the stop command runs on the tokio runtime, where `block_on` is not allowed.
pub(crate) async fn clamp_timer(pool: &Pool<Sqlite>, timer_id: i64, end: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM app_usage WHERE timer_id = $1 AND started_at >= $2")
        .bind(timer_id)
        .bind(end)
        .execute(pool)
        .await
        .map_err(db_err)?;
    sqlx::query(
        "UPDATE app_usage SET ended_at = $2, last_seen_at = MIN(last_seen_at, $2) \
         WHERE timer_id = $1 AND (ended_at IS NULL OR ended_at > $2)",
    )
    .bind(timer_id)
    .bind(end)
    .execute(pool)
    .await
    .map_err(db_err)?;
    Ok(())
}

/// stored icons for `app_ids`, skipping ids with no row or a failed capture
/// so the webview can fall back to initials. the id list is small (the apps
/// on screen), so a dynamic `IN` list is cheaper than a full table scan.
pub(crate) async fn read_icons(pool: &Pool<Sqlite>, app_ids: &[String]) -> Result<Vec<(String, Vec<u8>)>, String> {
    if app_ids.is_empty() {
        return Ok(Vec::new());
    }
    let placeholders = (1..=app_ids.len()).map(|i| format!("${i}")).collect::<Vec<_>>().join(", ");
    let sql = format!("SELECT app_id, icon_png FROM app_icons WHERE icon_png IS NOT NULL AND app_id IN ({placeholders})");
    let mut query = sqlx::query(&sql);
    for id in app_ids {
        query = query.bind(id);
    }
    let rows = query.fetch_all(pool).await.map_err(db_err)?;
    rows.iter()
        .map(|r| Ok((r.try_get::<String, _>(0).map_err(db_err)?, r.try_get::<Vec<u8>, _>(1).map_err(db_err)?)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    // the local `Row` struct below shadows the trait's name; keep its methods in scope
    use sqlx::Row as _;
    use sqlx::sqlite::SqlitePoolOptions;

    const INITIAL: &str = include_str!("../../migrations/202605281332_initial_schema.sql");
    const USAGE: &str = include_str!("../../migrations/202610071200_app_usage.sql");

    struct Fixture {
        pool: Pool<Sqlite>,
        store: SqliteStore,
        timer_id: i64,
    }

    fn fixture() -> Fixture {
        tauri::async_runtime::block_on(async {
            // one connection: each sqlite in-memory connection is its own database
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .expect("in-memory sqlite");
            sqlx::raw_sql(INITIAL).execute(&pool).await.expect("initial schema");
            sqlx::raw_sql(USAGE).execute(&pool).await.expect("usage schema");
            let timer_id = sqlx::query("INSERT INTO timers (status, date, start, total) VALUES ('running', '2026-10-07', '10:00:00', 0)")
                .execute(&pool)
                .await
                .expect("timer row")
                .last_insert_rowid();
            Fixture { store: SqliteStore::new(pool.clone()), pool, timer_id }
        })
    }

    #[derive(Debug, PartialEq)]
    struct Row {
        kind: String,
        app_id: String,
        started_at: i64,
        last_seen_at: i64,
        ended_at: Option<i64>,
    }

    fn rows(pool: &Pool<Sqlite>) -> Vec<Row> {
        tauri::async_runtime::block_on(async {
            sqlx::query("SELECT kind, app_id, started_at, last_seen_at, ended_at FROM app_usage ORDER BY id")
                .fetch_all(pool)
                .await
                .expect("rows")
                .iter()
                .map(|r| Row {
                    kind: r.get(0),
                    app_id: r.get(1),
                    started_at: r.get(2),
                    last_seen_at: r.get(3),
                    ended_at: r.get(4),
                })
                .collect()
        })
    }

    #[test]
    fn segment_lifecycle() {
        let mut f = fixture();
        let id = f.store.insert_segment(f.timer_id, Kind::Active, "com.apple.Safari", "Safari", 1_000).unwrap();
        f.store.heartbeat(id, 16_000).unwrap();
        assert_eq!(rows(&f.pool)[0].last_seen_at, 16_000);
        f.store.close_segment(id, 20_000).unwrap();
        let row = &rows(&f.pool)[0];
        assert_eq!((row.kind.as_str(), row.ended_at, row.last_seen_at), ("active", Some(20_000), 20_000));
        // heartbeat never reopens a closed row
        f.store.heartbeat(id, 30_000).unwrap();
        assert_eq!(rows(&f.pool)[0].last_seen_at, 20_000);
    }

    #[test]
    fn sweep_closes_open_rows_at_heartbeat() {
        let mut f = fixture();
        let id = f.store.insert_segment(f.timer_id, Kind::Active, "a", "A", 1_000).unwrap();
        f.store.heartbeat(id, 46_000).unwrap();
        f.store.sweep_open().unwrap();
        assert_eq!(rows(&f.pool)[0].ended_at, Some(46_000));
    }

    #[test]
    fn clamp_drops_later_rows_and_caps_open_ones() {
        let mut f = fixture();
        let open = f.store.insert_segment(f.timer_id, Kind::Active, "a", "A", 1_000).unwrap();
        f.store.heartbeat(open, 90_000).unwrap();
        let sleep = f.store.insert_segment(f.timer_id, Kind::Idle, "", "Sleep", 100_000).unwrap();
        f.store.close_segment(sleep, 200_000).unwrap();
        f.store.insert_segment(f.timer_id, Kind::Active, "b", "B", 200_000).unwrap();
        tauri::async_runtime::block_on(clamp_timer(&f.pool, f.timer_id, 50_000)).unwrap();
        let got = rows(&f.pool);
        assert_eq!(got.len(), 1);
        assert_eq!((got[0].ended_at, got[0].last_seen_at), (Some(50_000), 50_000));
    }

    #[test]
    fn icons_upsert_and_lookup() {
        let mut f = fixture();
        assert_eq!(f.store.icon_captured_at("x").unwrap(), None);
        f.store.upsert_icon("x", Some(&[1, 2, 3]), 128, 5_000).unwrap();
        assert_eq!(f.store.icon_captured_at("x").unwrap(), Some(5_000));
        // a failed capture is recorded too, so it is not retried every session
        f.store.upsert_icon("x", None, 128, 9_000).unwrap();
        assert_eq!(f.store.icon_captured_at("x").unwrap(), Some(9_000));
    }

    #[test]
    fn read_icons_skips_missing_and_failed_captures() {
        let mut f = fixture();
        f.store.upsert_icon("a", Some(&[1, 2]), 128, 1_000).unwrap();
        f.store.upsert_icon("b", None, 128, 1_000).unwrap();
        let ids = ["a", "b", "c"].map(String::from);
        let got = tauri::async_runtime::block_on(read_icons(&f.pool, &ids)).unwrap();
        assert_eq!(got, vec![("a".to_string(), vec![1, 2])]);
        assert!(tauri::async_runtime::block_on(read_icons(&f.pool, &[])).unwrap().is_empty());
    }

    #[test]
    fn deleting_the_timer_cascades() {
        let mut f = fixture();
        f.store.insert_segment(f.timer_id, Kind::Active, "a", "A", 1_000).unwrap();
        tauri::async_runtime::block_on(sqlx::query("DELETE FROM timers WHERE id = $1").bind(f.timer_id).execute(&f.pool)).unwrap();
        assert!(rows(&f.pool).is_empty());
    }
}
