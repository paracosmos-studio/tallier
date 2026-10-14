// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! records which app is in the foreground while a timer runs.
//!
//! rust owns the whole lifecycle: a tracker thread per running timer listens
//! for platform events, polls once a second as a safety net, and writes
//! `app_usage` segments through the pool `tauri-plugin-sql` opened for the
//! webview. the webview only calls `start_usage_tracking` / `stop_usage_tracking`
//! around the timer; it survives route changes because nothing here depends on
//! a page being mounted. see `docs/app-usage-tracking.md`.

mod denylist;
mod idle;
#[cfg(target_os = "macos")]
mod macos;
mod platform;
mod store;
mod tracker;
#[cfg(windows)]
mod windows;

use std::collections::HashMap;
use std::sync::Arc;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{DbInstances, DbPool};

use crate::files::base64_encode;
use crate::util::now_ms;
use platform::{MainThread, Platform, PlatformEvent};
use store::SqliteStore;
use tracker::Tracker;

/// must match `connection.ts` and the plugin registration in `lib.rs`
const DB_URL: &str = "sqlite:tallier.db";
const TICK: Duration = Duration::from_secs(1);

struct Active {
    timer_id: i64,
    tx: Sender<PlatformEvent>,
    join: Option<JoinHandle<()>>,
}

/// async mutex so start / stop serialize across their awaits
pub(crate) struct UsageState(tauri::async_runtime::Mutex<Option<Active>>);

impl UsageState {
    pub(crate) fn new() -> Self {
        Self(tauri::async_runtime::Mutex::new(None))
    }
}

struct TauriMainThread(AppHandle);

impl MainThread for TauriMainThread {
    fn run(&self, f: Box<dyn FnOnce() + Send + 'static>) -> Result<(), String> {
        self.0.run_on_main_thread(f).map_err(|e| e.to_string())
    }
}

/// the pool exists only after the webview's `Database.load`; the layout gates
/// every route on that, so this fails only if called out of order
async fn pool(app: &AppHandle) -> Result<Pool<Sqlite>, String> {
    let instances = app.state::<DbInstances>();
    let guard = instances.0.read().await;
    match guard.get(DB_URL) {
        Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err("db not loaded".to_string()),
    }
}

fn log(error: String) {
    eprintln!("usage tracker: {error}");
}

fn run_loop(mut platform: Box<dyn Platform>, store: SqliteStore, timer_id: i64, rx: Receiver<PlatformEvent>, tx: Sender<PlatformEvent>) {
    let mut tracker = Tracker::new(store, timer_id);
    let mut requests = tracker.start(now_ms(), platform.poll_foreground()).unwrap_or_else(|e| {
        log(e);
        Vec::new()
    });
    let mut last_tick = now_ms();

    loop {
        for app in requests.drain(..) {
            platform.request_icon(&app, tx.clone());
        }

        let message = rx.recv_timeout(TICK);
        let now = now_ms();
        match message {
            Ok(PlatformEvent::Stop) | Err(RecvTimeoutError::Disconnected) => break,
            Ok(event) => match tracker.on_event(event, now, platform.poll_foreground()) {
                Ok(more) => requests.extend(more),
                Err(e) => log(e),
            },
            Err(RecvTimeoutError::Timeout) => {}
        }

        // a busy event stream must not starve the tick: idle detection, the
        // heartbeat and poll reconciliation run at least once a second
        if now - last_tick >= TICK.as_millis() as i64 {
            last_tick = now;
            match tracker.on_tick(now, idle::idle_seconds(), platform.poll_foreground()) {
                Ok(more) => requests.extend(more),
                Err(e) => log(e),
            }
        }
    }

    platform.stop();
}

/// stops the thread, then clamps the timer's rows to `end` (now by default)
async fn finish(mut active: Active, pool: Result<Pool<Sqlite>, String>, end_at_ms: Option<i64>) -> Result<(), String> {
    let _ = active.tx.send(PlatformEvent::Stop);
    if let Some(join) = active.join.take() {
        tauri::async_runtime::spawn_blocking(move || {
            let _ = join.join();
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    let end = end_at_ms.unwrap_or_else(now_ms);
    store::clamp_timer(&pool?, active.timer_id, end).await
}

/// idempotent for the running timer: the home page remounts on every return
/// from settings and calls this again. a different timer id stops the old
/// tracker first.
#[tauri::command]
pub(crate) async fn start_usage_tracking(app: AppHandle, timer_id: i64) -> Result<(), String> {
    let state = app.state::<UsageState>();
    let mut guard = state.0.lock().await;
    if guard.as_ref().is_some_and(|active| active.timer_id == timer_id) {
        return Ok(());
    }
    let pool = pool(&app).await?;
    if let Some(active) = guard.take() {
        finish(active, Ok(pool.clone()), None).await?;
    }

    let (tx, rx) = mpsc::channel();
    let mut platform = platform::new_platform();
    let main: Arc<dyn MainThread> = Arc::new(TauriMainThread(app.clone()));
    platform.start(main, tx.clone())?;

    let store = SqliteStore::new(pool);
    let thread_tx = tx.clone();
    let join = thread::Builder::new()
        .name("usage-tracker".to_string())
        .spawn(move || run_loop(platform, store, timer_id, rx, thread_tx))
        .map_err(|e| e.to_string())?;
    *guard = Some(Active { timer_id, tx, join: Some(join) });
    Ok(())
}

/// no-op when nothing is tracking, so the webview calls it on every timer
/// stop. `end_at_ms` clamps the rows for auto-pause (pre-sleep timestamp).
#[tauri::command]
pub(crate) async fn stop_usage_tracking(app: AppHandle, end_at_ms: Option<i64>) -> Result<(), String> {
    let state = app.state::<UsageState>();
    let mut guard = state.0.lock().await;
    let Some(active) = guard.take() else { return Ok(()) };
    let pool = pool(&app).await;
    finish(active, pool, end_at_ms).await
}

/// icons for `app_ids` as png data uris, keyed by app id. ids without a
/// stored icon are left out; the webview renders initials for those.
#[tauri::command]
pub(crate) async fn read_app_icons(app: AppHandle, app_ids: Vec<String>) -> Result<HashMap<String, String>, String> {
    let pool = pool(&app).await?;
    let icons = store::read_icons(&pool, &app_ids).await?;
    Ok(icons
        .into_iter()
        .map(|(id, png)| (id, format!("data:image/png;base64,{}", base64_encode(&png))))
        .collect())
}

/// false on targets without a backend; the webview hides the toggle
#[tauri::command]
pub(crate) fn usage_tracking_supported() -> bool {
    platform::SUPPORTED
}

#[cfg(test)]
mod tests {
    use super::*;
    use platform::NullPlatform;
    use sqlx::Row as _;
    use sqlx::sqlite::SqlitePoolOptions;

    /// the thread + store plumbing end to end: `block_on` from a plain thread,
    /// the stop message, and the clamp the command runs afterwards
    #[test]
    fn loop_records_and_stop_clamps() {
        let (pool, timer_id) = tauri::async_runtime::block_on(async {
            let pool = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
            sqlx::raw_sql(include_str!("../../migrations/202605281332_initial_schema.sql")).execute(&pool).await.unwrap();
            sqlx::raw_sql(include_str!("../../migrations/202610071200_app_usage.sql")).execute(&pool).await.unwrap();
            let id = sqlx::query("INSERT INTO timers (status, date, start, total) VALUES ('running', '2026-10-07', '10:00:00', 0)")
                .execute(&pool)
                .await
                .unwrap()
                .last_insert_rowid();
            (pool, id)
        });

        let started = now_ms();
        let (tx, rx) = mpsc::channel();
        let thread_tx = tx.clone();
        let store = SqliteStore::new(pool.clone());
        let join = thread::spawn(move || run_loop(Box::new(NullPlatform), store, timer_id, rx, thread_tx));
        thread::sleep(Duration::from_millis(1300));
        tx.send(PlatformEvent::Stop).unwrap();
        join.join().unwrap();

        let end = now_ms();
        tauri::async_runtime::block_on(store::clamp_timer(&pool, timer_id, end)).unwrap();

        let rows = tauri::async_runtime::block_on(
            sqlx::query("SELECT kind, started_at, ended_at FROM app_usage WHERE timer_id = $1").bind(timer_id).fetch_all(&pool),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        let (kind, started_at, ended_at): (String, i64, Option<i64>) = (rows[0].get(0), rows[0].get(1), rows[0].get(2));
        assert_eq!(kind, "unknown");
        assert!(started_at >= started && ended_at == Some(end));
    }
}
