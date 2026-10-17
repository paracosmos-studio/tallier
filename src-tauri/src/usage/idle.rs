// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! seconds since the last keyboard / mouse input. neither call needs a
//! permission: coregraphics reads the hid system state (sandbox-safe), win32
//! reads the session's last-input tick.

#[cfg(target_os = "macos")]
pub(crate) fn idle_seconds() -> Option<f64> {
    use objc2_core_graphics::{CGEventSource, CGEventSourceStateID, CGEventType};

    // kCGAnyInputEventType is `(CGEventType)(~0)`; the bindings do not export it
    const ANY_INPUT: CGEventType = CGEventType(u32::MAX);

    let secs = CGEventSource::seconds_since_last_event_type(CGEventSourceStateID::HIDSystemState, ANY_INPUT);
    (secs.is_finite() && secs >= 0.0).then_some(secs)
}

#[cfg(windows)]
pub(crate) fn idle_seconds() -> Option<f64> {
    use windows::Win32::System::SystemInformation::GetTickCount64;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    // GetLastInputInfo rejects the call unless cbSize is set
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    let ok = unsafe { GetLastInputInfo(&mut info) };
    if !ok.as_bool() {
        return None;
    }
    // dwTime is the low 32 bits of the tick count; wrapping_sub survives the
    // 49.7 day rollover
    let now = unsafe { GetTickCount64() } as u32;
    Some(f64::from(now.wrapping_sub(info.dwTime)) / 1000.0)
}

#[cfg(not(any(target_os = "macos", windows)))]
pub(crate) fn idle_seconds() -> Option<f64> {
    None
}
