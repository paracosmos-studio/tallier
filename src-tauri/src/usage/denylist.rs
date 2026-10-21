// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! system surfaces that briefly take focus without being "the app the user is
//! working in". activations from these are ignored, so their time stays with
//! the previous segment. windows shell frames (taskbar, desktop) are filtered
//! by window class in `windows.rs` because the exe (explorer) is also the
//! file manager.

const MAC_BUNDLE_IDS: &[&str] = &[
    "com.apple.dock",
    "com.apple.spotlight",
    "com.apple.loginwindow",
    "com.apple.screensaver.engine",
    "com.apple.notificationcenterui",
    "com.apple.controlcenter",
    "com.apple.windowmanager",
];

const WIN_EXE_STEMS: &[&str] = &[
    "lockapp",
    "searchhost",
    "shellexperiencehost",
    "startmenuexperiencehost",
    "logonui",
];

pub(crate) fn is_denied(app_id: &str) -> bool {
    let lower = app_id.to_ascii_lowercase();
    if MAC_BUNDLE_IDS.contains(&lower.as_str()) {
        return true;
    }
    let stem = exe_stem(&lower);
    WIN_EXE_STEMS.contains(&stem)
}

/// `c:\windows\system32\lockapp.exe` -> `lockapp`. input is already lowercase.
fn exe_stem(path: &str) -> &str {
    let file = path.rsplit(['\\', '/']).next().unwrap_or(path);
    file.strip_suffix(".exe").unwrap_or(file)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn denies_known_system_surfaces() {
        assert!(is_denied("com.apple.dock"));
        assert!(is_denied("com.apple.Spotlight"));
        assert!(is_denied(r"c:\windows\systemapps\microsoft.lockapp_cw5n1h2txyewy\lockapp.exe"));
        assert!(is_denied(r"C:\Windows\System32\LogonUI.exe"));
    }

    #[test]
    fn allows_regular_apps() {
        assert!(!is_denied("com.apple.Safari"));
        assert!(!is_denied("com.paracosmos.tallier"));
        assert!(!is_denied(r"c:\windows\explorer.exe"));
        assert!(!is_denied(r"c:\program files\google\chrome\application\chrome.exe"));
    }
}
