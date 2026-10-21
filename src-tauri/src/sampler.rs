// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! screen color sampling. macos uses `NSColorSampler`, the system loupe: no
//! tcc prompt, sandbox-safe. webview2 ships the web `EyeDropper` api, so
//! windows never calls in here.

use tauri::AppHandle;

/// whether `sample_screen_color` has a native backend on this target
#[tauri::command]
pub fn color_sampler_supported() -> bool {
    cfg!(target_os = "macos")
}

/// shows the system sampler and resolves to `#RRGGBB`, or `None` on cancel
#[tauri::command]
pub async fn sample_screen_color(app: AppHandle) -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        macos::sample(&app).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Err("color sampling is not supported on this platform".into())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::cell::Cell;
    use std::sync::mpsc;

    use block2::RcBlock;
    use objc2_app_kit::{NSColor, NSColorSampler, NSColorSpace};
    use tauri::AppHandle;

    fn to_hex(color: &NSColor) -> Option<String> {
        let srgb = color.colorUsingColorSpace(&NSColorSpace::sRGBColorSpace())?;
        let byte = |c: f64| (c.clamp(0.0, 1.0) * 255.0).round() as u8;
        Some(format!(
            "#{:02X}{:02X}{:02X}",
            byte(srgb.redComponent()),
            byte(srgb.greenComponent()),
            byte(srgb.blueComponent()),
        ))
    }

    pub(super) async fn sample(app: &AppHandle) -> Result<Option<String>, String> {
        let (tx, rx) = mpsc::channel::<Option<String>>();
        app.run_on_main_thread(move || {
            // appkit calls the handler once, on the main thread; the cell
            // satisfies the `Fn` bound
            let tx = Cell::new(Some(tx));
            let handler = RcBlock::new(move |color: *mut NSColor| {
                // SAFETY: appkit passes a live color or nil on cancel
                let hex = unsafe { color.as_ref() }.and_then(to_hex);
                if let Some(tx) = tx.take() {
                    let _ = tx.send(hex);
                }
            });
            // the sampler retains itself until the session ends
            unsafe { NSColorSampler::new().showSamplerWithSelectionHandler(&handler) };
        })
        .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn_blocking(move || rx.recv())
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())
    }
}
