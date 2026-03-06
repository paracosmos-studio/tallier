use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{
    AppHandle, Emitter, Manager, Wry,
    menu::{CheckMenuItem, IconMenuItem, Menu, PredefinedMenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder},
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(serde::Deserialize, Clone)]
struct TrayProject {
    id: i64,
    name: String,
}

struct TrayInner {
    icon: TrayIcon,
    is_running: Arc<AtomicBool>,
    stop_signal: Arc<AtomicBool>,
    show_title: Arc<AtomicBool>,
}

struct TrayState(Mutex<Option<TrayInner>>);

fn format_elapsed(total: u64) -> String {
    format!("{:02}:{:02}:{:02}", total / 3600, (total % 3600) / 60, total % 60)
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn spawn_ticker(
    app: AppHandle,
    base: u64,
    started_at_ms: i64,
    stop: Arc<AtomicBool>
) {
    thread::spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_secs(1));

            if stop.load(Ordering::Relaxed) { break; }

            let live = ((now_ms() - started_at_ms) / 1000).max(0) as u64;
            let title = format_elapsed(base + live);
            let state = app.state::<TrayState>();

            if let Ok(guard) = state.0.lock() {
                if let Some(ref inner) = *guard {
                    if inner.show_title.load(Ordering::Relaxed) {
                        let _ = inner.icon.set_title(Some(&title));
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

    let toggle = IconMenuItem::with_id(
        app,
        "tray_toggle",
        toggle_label,
        running || selected_id.is_some(),
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
        "Open Tally",
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
fn set_tray_timer(
    app: AppHandle,
    base_elapsed: u64,
    started_at_ms: Option<i64>,
    projects: Vec<TrayProject>,
    selected_id: Option<i64>,
    show_title: bool,
) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let running = started_at_ms.is_some();

    let menu = build_menu(&app, running, &projects, selected_id)?;

    if let Some(ref mut inner) = *guard {
        inner.stop_signal.store(true, Ordering::Relaxed);
        inner.is_running.store(running, Ordering::Relaxed);
        inner.show_title.store(show_title, Ordering::Relaxed);
        inner.icon.set_menu(Some(menu)).map_err(|e| e.to_string())?;

        if show_title {
            let title = if let Some(ms) = started_at_ms {
                format_elapsed(base_elapsed + ((now_ms() - ms) / 1000).max(0) as u64)
            } else {
                format_elapsed(base_elapsed)
            };
            inner.icon.set_title(Some(&title)).map_err(|e| e.to_string())?;
        } else {
            inner.icon.set_title(Some("")).map_err(|e| e.to_string())?;
        }

        if show_title {
            if let Some(ms) = started_at_ms {
                let stop = Arc::new(AtomicBool::new(false));
                inner.stop_signal = stop.clone();
                spawn_ticker(app.clone(), base_elapsed, ms, stop);
            } else {
                inner.stop_signal = Arc::new(AtomicBool::new(true));
            }
        } else {
            inner.stop_signal = Arc::new(AtomicBool::new(true));
        }

        return Ok(());
    }

    // first call: create tray icon
    let is_running = Arc::new(AtomicBool::new(running));
    let is_running_clone = is_running.clone();

    let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray_128x128.png"))
        .map_err(|e| e.to_string())?;

    let mut builder = TrayIconBuilder::new()
        .icon(tray_icon)
        .icon_as_template(true)
        .tooltip("Tally")
        .menu(&menu)
        .show_menu_on_left_click(true);

    if show_title {
        let title = if let Some(ms) = started_at_ms {
            format_elapsed(base_elapsed + ((now_ms() - ms) / 1000).max(0) as u64)
        } else {
            format_elapsed(base_elapsed)
        };
        builder = builder.title(&title);
    }

    let icon = builder
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

    let stop_signal = if show_title {
        if let Some(ms) = started_at_ms {
            let stop = Arc::new(AtomicBool::new(false));
            spawn_ticker(app.clone(), base_elapsed, ms, stop.clone());
            stop
        } else {
            Arc::new(AtomicBool::new(true))
        }
    } else {
        Arc::new(AtomicBool::new(true))
    };

    *guard = Some(TrayInner {
        icon,
        is_running,
        stop_signal,
        show_title: Arc::new(AtomicBool::new(show_title)),
    });

    Ok(())
}

#[tauri::command]
fn set_tray_show_title(app: AppHandle, show: bool) -> Result<(), String> {
    let state = app.state::<TrayState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut inner) = *guard {
        inner.show_title.store(show, Ordering::Relaxed);
        if show {
            inner.icon.set_title(Some(&format_elapsed(0))).map_err(|e| e.to_string())?;
        } else {
            inner.stop_signal.store(true, Ordering::Relaxed);
            inner.stop_signal = Arc::new(AtomicBool::new(true));
            inner.icon.set_title(Some("")).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

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
        .manage(TrayState(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tally.db", load_migrations())
                .build()
        )
        .invoke_handler(tauri::generate_handler![set_tray_timer, set_tray_show_title])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
