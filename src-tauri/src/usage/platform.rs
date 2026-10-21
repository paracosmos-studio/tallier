// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! os-neutral surface for the usage tracker. one implementation per platform
//! (`macos.rs`, `windows.rs`); every other target gets `NullPlatform`, which
//! never reports an app so the tracker records `unknown`.

use std::sync::Arc;
use std::sync::mpsc::Sender;

pub(crate) const ICON_SIZE: i64 = 128;
pub(crate) const SUPPORTED: bool = cfg!(any(target_os = "macos", windows));

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ForegroundApp {
    pub id: String,
    pub name: String,
    pub pid: i32,
}

#[derive(Debug)]
pub(crate) enum PlatformEvent {
    /// the foreground app changed. `None` is a transient "no window" state
    /// (lock screen, uac desktop, mid-switch) and never creates a segment.
    Foreground(Option<ForegroundApp>),
    Sleep,
    Wake,
    Lock,
    Unlock,
    /// result of `Platform::request_icon`; `png` is `None` when capture failed
    Icon { app_id: String, png: Option<Vec<u8>>, size: i64 },
    /// sent by `stop_usage_tracking` to wake the tracker thread
    Stop,
}

/// runs a closure on the ui thread. appkit observers and icon rendering must
/// live there; implemented for `tauri::AppHandle` in `mod.rs`.
pub(crate) trait MainThread: Send + Sync {
    fn run(&self, f: Box<dyn FnOnce() + Send + 'static>) -> Result<(), String>;
}

pub(crate) trait Platform: Send {
    /// subscribe to foreground / power / session events, delivered on `tx`
    fn start(&mut self, main: Arc<dyn MainThread>, tx: Sender<PlatformEvent>) -> Result<(), String>;
    /// current foreground app; called from the tracker thread once a second
    fn poll_foreground(&self) -> Option<ForegroundApp>;
    /// capture the app's icon as png and deliver it as `PlatformEvent::Icon`
    fn request_icon(&self, app: &ForegroundApp, tx: Sender<PlatformEvent>);
    /// unsubscribe; called from the tracker thread on exit
    fn stop(&mut self);
}

pub(crate) fn new_platform() -> Box<dyn Platform> {
    #[cfg(target_os = "macos")]
    {
        Box::new(super::macos::MacPlatform::new())
    }
    #[cfg(windows)]
    {
        Box::new(super::windows::WinPlatform::new())
    }
    #[cfg(not(any(target_os = "macos", windows)))]
    {
        Box::new(NullPlatform)
    }
}

#[cfg_attr(any(target_os = "macos", windows), allow(dead_code))]
pub(crate) struct NullPlatform;

impl Platform for NullPlatform {
    fn start(&mut self, _main: Arc<dyn MainThread>, _tx: Sender<PlatformEvent>) -> Result<(), String> {
        Ok(())
    }

    fn poll_foreground(&self) -> Option<ForegroundApp> {
        None
    }

    fn request_icon(&self, app: &ForegroundApp, tx: Sender<PlatformEvent>) {
        let _ = tx.send(PlatformEvent::Icon { app_id: app.id.clone(), png: None, size: ICON_SIZE });
    }

    fn stop(&mut self) {}
}
