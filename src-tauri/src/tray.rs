// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{
    AppHandle, Emitter, Manager, Wry,
    menu::{CheckMenuItem, IconMenuItem, Menu, PredefinedMenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder},
};

use crate::util::{format_elapsed, now_ms};

// gap in wall-clock between ticks that counts as a system sleep
const SLEEP_GAP_THRESHOLD_SECS: u64 = 45;

#[derive(serde::Deserialize, Clone)]
pub struct TrayProject {
    id: i64,
    name: String,
}

struct TrayInner {
    icon: TrayIcon,
    is_running: Arc<AtomicBool>,
    stop_signal: Arc<AtomicBool>,
    show_title: Arc<AtomicBool>,
    auto_pause_on_sleep: Arc<AtomicBool>,
}

pub(crate) struct TrayState(Mutex<Option<TrayInner>>);

impl TrayState {
    pub(crate) fn new() -> Self {
        Self(Mutex::new(None))
    }
}

// windows logo reflects timer state: live variant while running.
// no-op elsewhere (macos keeps the template icon set at build).
fn set_logo(icon: &TrayIcon, running: bool) -> Result<(), String> {
    if !cfg!(windows) {
        return Ok(());
    }
    let bytes: &[u8] = if running {
        include_bytes!("../icons/tray_colored_live.png")
    } else {
        include_bytes!("../icons/tray_colored.png")
    };
    let logo = tauri::image::Image::from_bytes(bytes).map_err(|e| e.to_string())?;
    icon.set_icon(Some(logo)).map_err(|e| e.to_string())
}

// platform time display: menu-bar title on macos/linux, hover tooltip on
// windows (set_title is a no-op there). cfg! keeps both branches
// typechecked on every platform.
fn show_time(icon: &TrayIcon, total: u64) -> Result<(), String> {
    if cfg!(windows) {
        icon.set_tooltip(Some(&format!("Tallier {}", format_elapsed(total))))
            .map_err(|e| e.to_string())
    } else {
        icon.set_title(Some(&format_elapsed(total))).map_err(|e| e.to_string())
    }
}

fn clear_time(icon: &TrayIcon) -> Result<(), String> {
    if cfg!(windows) {
        icon.set_tooltip(Some("Tallier")).map_err(|e| e.to_string())
    } else {
        icon.set_title(Some("")).map_err(|e| e.to_string())
    }
}

fn spawn_ticker(
    app: AppHandle,
    base: u64,
    started_at_ms: i64,
    stop: Arc<AtomicBool>,
    max_seconds: Option<u64>,
    auto_pause_on_sleep: Arc<AtomicBool>,
) {
    thread::spawn(move || {
        let mut limit_emitted = false;
        let mut prev_wall = SystemTime::now();

        while !stop.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_secs(1));

            if stop.load(Ordering::Relaxed) { break; }

            // wall-clock gap > 1s means the OS suspended this thread
            let wall_now = SystemTime::now();
            let gap_secs = wall_now
                .duration_since(prev_wall)
                .unwrap_or_default()
                .as_secs();

            if gap_secs >= SLEEP_GAP_THRESHOLD_SECS && auto_pause_on_sleep.load(Ordering::Relaxed) {
                let prev_ms = prev_wall
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let _ = app.emit("tray-menu-action", format!("auto_pause:{}", prev_ms));
                break;
            }
            prev_wall = wall_now;

            let live = ((now_ms() - started_at_ms) / 1000).max(0) as u64;
            let total = base + live;
            let state = app.state::<TrayState>();

            if let Ok(guard) = state.0.lock() {
                if let Some(ref inner) = *guard {
                    if inner.show_title.load(Ordering::Relaxed) {
                        let _ = show_time(&inner.icon, total);
                    }
                }
            }

            if !limit_emitted {
                if let Some(cap) = max_seconds {
                    if total >= cap {
                        let _ = app.emit("tray-menu-action", "limit_reached");
                        limit_emitted = true;
                    }
                }
            }
        }
    });
}

fn build_menu(
    app: &AppHandle,
    running: bool,
    projects: &[TrayProject],
    selected_id: Option<i64>,
    limit_reached: bool,
) -> Result<Menu<Wry>, String> {

    // tray menu icons
    let stop_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray/pause.png")).map_err(|e| e.to_string())?;
    let start_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray/play.png")).map_err(|e| e.to_string())?;
    let quit_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray/quit.png")).map_err(|e| e.to_string())?;
    let open_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray/open.png")).map_err(|e| e.to_string())?;
    let settings_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray/settings.png")).map_err(|e| e.to_string())?;

    // stop / start toggle
    let toggle_label = if running { "Stop Timer" } else { "Start Timer" };
    let toggle_icon = if running { stop_icon } else { start_icon };

    let toggle_enabled = if running {
        true
    } else {
        selected_id.is_some() && !limit_reached
    };

    let toggle = IconMenuItem::with_id(
        app,
        "tray_toggle",
        toggle_label,
        toggle_enabled,
        Some(toggle_icon),
        None::<&str>,
    ).map_err(|e| e.to_string())?;

    // list of projects
    let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<Wry>>> = vec![Box::new(toggle)];

    let minimum_projects: usize = 3;

    if !projects.is_empty() {
        items.push(Box::new(
            PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
        ));

        let has_overflow = projects.len() > minimum_projects;

        // if selected is in overflow, promote it to the last visible slot
        let overflow_selected_idx = has_overflow
            .then(|| {
                selected_id.and_then(|sid| {
                    projects[minimum_projects..]
                        .iter()
                        .position(|p| p.id == sid)
                        .map(|pos| minimum_projects + pos)
                })
            })
            .flatten();

        let (visible_projects, submenu_projects): (Vec<&TrayProject>, Vec<&TrayProject>) =
            if let Some(sel_idx) = overflow_selected_idx {
                (
                    projects[..minimum_projects - 1]
                        .iter()
                        .chain(std::iter::once(&projects[sel_idx]))
                        .collect(),
                    std::iter::once(&projects[minimum_projects - 1])
                        .chain(projects[minimum_projects..sel_idx].iter())
                        .chain(projects[sel_idx + 1..].iter())
                        .collect(),
                )
            } else {
                (
                    projects[..projects.len().min(minimum_projects)].iter().collect(),
                    if has_overflow { projects[minimum_projects..].iter().collect() } else { vec![] },
                )
            };

        for p in &visible_projects {
            let checked = selected_id == Some(p.id);
            items.push(Box::new(
                CheckMenuItem::with_id(
                    app,
                    format!("project_{}",
                    p.id),
                    &p.name,
                    !running,
                    checked,
                    None::<&str>,
                ).map_err(|e| e.to_string())?,
            ));
        }

        if !submenu_projects.is_empty() {
            let sub_items: Vec<Box<dyn tauri::menu::IsMenuItem<Wry>>> = submenu_projects
                .iter()
                .map(|p| {
                    let checked = selected_id == Some(p.id);
                    Ok(Box::new(
                        CheckMenuItem::with_id(
                            app,
                            format!("subproject_{}",
                            p.id),
                            &p.name,
                            !running,
                            checked,
                            None::<&str>,
                        ).map_err(|e| e.to_string())?,
                    ) as Box<dyn tauri::menu::IsMenuItem<Wry>>)
                })
                .collect::<Result<Vec<_>, String>>()?;

            let sub_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> =
                sub_items.iter().map(|b| &**b as &dyn tauri::menu::IsMenuItem<Wry>).collect();

            items.push(Box::new(
                Submenu::with_id_and_items(app, "show_more", "Show More", true, &sub_refs)
                    .map_err(|e| e.to_string())?,
            ));
        }
    }

    items.push(Box::new(
        PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
    ));

    let open = IconMenuItem::with_id(
        app,
        "tray_open",
        "Open Tallier",
        true,
        Some(open_icon),
        None::<&str>
    ).map_err(|e| e.to_string())?;

    let settings = IconMenuItem::with_id(
        app,
        "tray_settings",
        "Settings",
        true,
        Some(settings_icon),
        None::<&str>
    ).map_err(|e| e.to_string())?;

    let quit = IconMenuItem::with_id(
        app,
        "tray_quit",
        "Quit",
        true,
        Some(quit_icon),
        None::<&str>
    ).map_err(|e| e.to_string())?;

    items.push(Box::new(open));
    items.push(Box::new(settings));
    items.push(Box::new(quit));

    let refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> =
        items.iter().map(|b| &**b as &dyn tauri::menu::IsMenuItem<Wry>).collect();

    Menu::with_items(app, &refs).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_tray_timer(
    app: AppHandle,
    base_elapsed: u64,
    started_at_ms: Option<i64>,
    projects: Vec<TrayProject>,
    selected_id: Option<i64>,
    show_title: bool,
    max_seconds: Option<u64>,
    limit_reached: bool,
    auto_pause_on_sleep: bool,
) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let running = started_at_ms.is_some();
    let needs_ticker = running && (show_title || auto_pause_on_sleep);
    let initial_total = base_elapsed
        + started_at_ms
            .map(|ms| ((now_ms() - ms) / 1000).max(0) as u64)
            .unwrap_or(0);

    let menu = build_menu(&app, running, &projects, selected_id, limit_reached)?;

    if let Some(ref mut inner) = *guard {
        inner.stop_signal.store(true, Ordering::Relaxed);
        inner.is_running.store(running, Ordering::Relaxed);
        inner.show_title.store(show_title, Ordering::Relaxed);
        inner.auto_pause_on_sleep.store(auto_pause_on_sleep, Ordering::Relaxed);
        inner.icon.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        set_logo(&inner.icon, running)?;

        if show_title {
            show_time(&inner.icon, initial_total)?;
        } else {
            clear_time(&inner.icon)?;
        }

        if needs_ticker {
            let ms = started_at_ms.unwrap();
            let stop = Arc::new(AtomicBool::new(false));
            inner.stop_signal = stop.clone();
            spawn_ticker(
                app.clone(),
                base_elapsed,
                ms,
                stop,
                max_seconds,
                inner.auto_pause_on_sleep.clone(),
            );
        } else {
            inner.stop_signal = Arc::new(AtomicBool::new(true));
        }

        return Ok(());
    }

    // first call: create tray icon
    let is_running = Arc::new(AtomicBool::new(running));
    let is_running_clone = is_running.clone();
    let auto_pause_flag = Arc::new(AtomicBool::new(auto_pause_on_sleep));

    let tray_icon = if cfg!(windows) {
        tauri::image::Image::from_bytes(include_bytes!("../icons/tray_colored.png"))
    } else {
        tauri::image::Image::from_bytes(include_bytes!("../icons/tray_128x128.png"))
    }
    .map_err(|e| e.to_string())?;

    let icon = TrayIconBuilder::new()
        .icon(tray_icon)
        .icon_as_template(true)
        .tooltip("Tallier")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| {
            let id = event.id().as_ref();
            match id {
                "tray_toggle" => {
                    let action = if is_running_clone.load(Ordering::Relaxed) {
                        "stop_timer"
                    } else {
                        "start_timer"
                    };
                    let _ = app.emit("tray-menu-action", action);
                }
                "tray_open" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "tray_settings" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                    let _ = app.emit("tray-menu-action", "settings");
                }
                "tray_quit" => {
                    let _ = app.emit("tray-menu-action", "quit");
                }
                _ => {
                    if let Some(proj_id) = id
                        .strip_prefix("project_")
                        .or_else(|| id.strip_prefix("subproject_"))
                    {
                        let _ = app.emit("tray-menu-action", format!("select_project:{}", proj_id));
                    }
                }
            }
        })
        .build(&app)
        .map_err(|e| e.to_string())?;

    set_logo(&icon, running)?;
    if show_title {
        show_time(&icon, initial_total)?;
    }

    let stop_signal = if needs_ticker {
        let ms = started_at_ms.unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        spawn_ticker(
            app.clone(),
            base_elapsed,
            ms,
            stop.clone(),
            max_seconds,
            auto_pause_flag.clone(),
        );
        stop
    } else {
        Arc::new(AtomicBool::new(true))
    };

    *guard = Some(TrayInner {
        icon,
        is_running,
        stop_signal,
        show_title: Arc::new(AtomicBool::new(show_title)),
        auto_pause_on_sleep: auto_pause_flag,
    });

    Ok(())
}

#[tauri::command]
pub fn set_tray_show_title(app: AppHandle, show: bool) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut inner) = *guard {
        inner.show_title.store(show, Ordering::Relaxed);
        if show {
            show_time(&inner.icon, 0)?;
        } else {
            // keep ticker alive when auto-pause still needs sleep detection
            if !inner.auto_pause_on_sleep.load(Ordering::Relaxed) {
                inner.stop_signal.store(true, Ordering::Relaxed);
                inner.stop_signal = Arc::new(AtomicBool::new(true));
            }
            clear_time(&inner.icon)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_tray_auto_pause(app: AppHandle, enabled: bool) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref inner) = *guard {
        inner.auto_pause_on_sleep.store(enabled, Ordering::Relaxed);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn tray_logos_decode() {
        for bytes in [
            &include_bytes!("../icons/tray_colored.png")[..],
            &include_bytes!("../icons/tray_colored_live.png")[..],
            &include_bytes!("../icons/tray_128x128.png")[..],
        ] {
            assert!(tauri::image::Image::from_bytes(bytes).is_ok());
        }
    }
}

