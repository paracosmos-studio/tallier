use std::sync::Mutex;
use tauri::{AppHandle, LogicalSize, Manager, Size};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum WindowProfile {
    Compact,
    Wide,
}

impl WindowProfile {
    fn parse(name: &str) -> Result<Self, String> {
        match name {
            "compact" => Ok(Self::Compact),
            "wide" => Ok(Self::Wide),
            other => Err(format!("unknown window profile: {}", other)),
        }
    }

    // (default w, default h, min w, min h, max w, max h, resizable)
    // max is None means no upper bound
    fn bounds(self) -> (f64, f64, f64, f64, Option<(f64, f64)>, bool) {
        match self {
            Self::Compact => (400.0, 250.0, 400.0, 250.0, Some((400.0, 600.0)), false),
            Self::Wide => (700.0, 480.0, 700.0, 480.0, Some((700.0, 480.0)), false),
        }
    }
}

pub(crate) struct WindowProfileState(Mutex<WindowProfile>);

impl WindowProfileState {
    pub(crate) fn new(profile: WindowProfile) -> Self {
        Self(Mutex::new(profile))
    }
}

pub(crate) fn apply_window_profile(app: &AppHandle, profile: WindowProfile) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("main window missing")?;
    let (w, h, min_w, min_h, max, resizable) = profile.bounds();

    // sequence: clear max first so a shrinking profile can apply min/size,
    // then set resizable, min, max, size in a single hop per call.
    win.set_max_size(None::<Size>).map_err(|e| e.to_string())?;
    win.set_resizable(resizable).map_err(|e| e.to_string())?;
    win.set_min_size(Some(Size::Logical(LogicalSize::new(min_w, min_h))))
        .map_err(|e| e.to_string())?;
    if let Some((mw, mh)) = max {
        win.set_max_size(Some(Size::Logical(LogicalSize::new(mw, mh))))
            .map_err(|e| e.to_string())?;
    }
    win.set_size(Size::Logical(LogicalSize::new(w, h)))
        .map_err(|e| e.to_string())?;

    if let Some(state) = app.try_state::<WindowProfileState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = profile;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_window_profile(app: AppHandle, name: &str) -> Result<(), String> {
    let profile = WindowProfile::parse(name)?;
    apply_window_profile(&app, profile)
}

#[tauri::command]
pub fn set_compact_height(app: AppHandle, px: u32) -> Result<(), String> {
    let state = app.state::<WindowProfileState>();
    let active = *state.0.lock().map_err(|e| e.to_string())?;
    if active != WindowProfile::Compact {
        return Ok(());
    }
    let (w, _, _, min_h, max, _) = WindowProfile::Compact.bounds();
    let max_h = max.map(|m| m.1).unwrap_or(f64::MAX);
    let clamped = (px as f64).clamp(min_h, max_h);
    let win = app.get_webview_window("main").ok_or("main window missing")?;
    win.set_size(Size::Logical(LogicalSize::new(w, clamped)))
        .map_err(|e| e.to_string())
}
