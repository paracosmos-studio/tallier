// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! win32 backend. a dedicated thread owns a message-only window and runs the
//! message pump that `SetWinEventHook` (foreground changes),
//! `WTSRegisterSessionNotification` (lock / unlock) and `WM_POWERBROADCAST`
//! (sleep / wake) deliver to. identity is the process image path; icons come
//! from the exe's own resources. no privilege beyond the user's session.

use std::cell::RefCell;
use std::ffi::c_void;
use std::path::Path;
use std::sync::Arc;
use std::sync::mpsc::{self, Sender};
use std::thread::{self, JoinHandle};

use windows::Win32::Foundation::{CloseHandle, HINSTANCE, HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BI_RGB, BITMAP, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, DeleteObject, GetDC, GetDIBits, GetObjectW, HBITMAP,
    ReleaseDC,
};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::RemoteDesktop::{
    NOTIFY_FOR_THIS_SESSION, WTSRegisterSessionNotification, WTSUnRegisterSessionNotification,
};
use windows::Win32::System::Threading::{
    GetCurrentThreadId, OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW,
};
use windows::Win32::UI::Accessibility::{HWINEVENTHOOK, SetWinEventHook, UnhookWinEvent};
use windows::Win32::UI::Shell::{SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON, SHGetFileInfoW};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyIcon, DestroyWindow, DispatchMessageW, EVENT_SYSTEM_FOREGROUND,
    EnumChildWindows, GetClassNameW, GetForegroundWindow, GetIconInfo, GetMessageW, GetWindowThreadProcessId, HICON,
    HWND_MESSAGE, ICONINFO, MSG, PBT_APMRESUMEAUTOMATIC, PBT_APMRESUMESUSPEND, PBT_APMSUSPEND, PostThreadMessageW,
    PrivateExtractIconsW, RegisterClassW, TranslateMessage, WINDOW_EX_STYLE, WINDOW_STYLE, WINEVENT_OUTOFCONTEXT,
    WM_POWERBROADCAST, WM_QUIT, WM_WTSSESSION_CHANGE, WNDCLASSW, WTS_SESSION_LOCK, WTS_SESSION_UNLOCK,
};
use windows::core::{BOOL, PCWSTR, PWSTR, w};

use super::platform::{ForegroundApp, ICON_SIZE, MainThread, Platform, PlatformEvent};

const MAX_PATH: usize = 260;
/// explorer.exe windows that are the shell (taskbar, desktop), not file explorer
const SHELL_CLASSES: &[&str] = &["Shell_TrayWnd", "Progman", "WorkerW"];

thread_local! {
    // the hook callback and the wndproc run on the hook thread; this is how
    // they reach the tracker
    static TX: RefCell<Option<Sender<PlatformEvent>>> = const { RefCell::new(None) };
}

fn send(event: PlatformEvent) {
    TX.with(|tx| {
        if let Some(tx) = tx.borrow().as_ref() {
            let _ = tx.send(event);
        }
    });
}

pub(crate) struct WinPlatform {
    thread_id: Option<u32>,
    join: Option<JoinHandle<()>>,
}

impl WinPlatform {
    pub(crate) fn new() -> Self {
        Self { thread_id: None, join: None }
    }
}

impl Platform for WinPlatform {
    fn start(&mut self, _main: Arc<dyn MainThread>, tx: Sender<PlatformEvent>) -> Result<(), String> {
        let (ready_tx, ready_rx) = mpsc::channel();
        let join = thread::Builder::new()
            .name("usage-winhook".to_string())
            .spawn(move || hook_thread(tx, ready_tx))
            .map_err(|e| e.to_string())?;
        let thread_id = ready_rx.recv().map_err(|_| "hook thread exited before setup".to_string())??;
        self.thread_id = Some(thread_id);
        self.join = Some(join);
        Ok(())
    }

    fn poll_foreground(&self) -> Option<ForegroundApp> {
        resolve(unsafe { GetForegroundWindow() })
    }

    fn request_icon(&self, app: &ForegroundApp, tx: Sender<PlatformEvent>) {
        let (png, size) = match extract_icon_png(&app.id) {
            Some((png, size)) => (Some(png), size),
            None => (None, ICON_SIZE),
        };
        let _ = tx.send(PlatformEvent::Icon { app_id: app.id.clone(), png, size });
    }

    fn stop(&mut self) {
        if let Some(thread_id) = self.thread_id.take() {
            // SAFETY: the hook thread created a window before reporting ready,
            // so it owns a message queue that can receive WM_QUIT
            unsafe {
                let _ = PostThreadMessageW(thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
            }
        }
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

fn hook_thread(tx: Sender<PlatformEvent>, ready: Sender<Result<u32, String>>) {
    TX.with(|slot| *slot.borrow_mut() = Some(tx));

    // SAFETY: this thread's one and only setup
    let (hwnd, hook) = match unsafe { setup_hooks() } {
        Ok(handles) => {
            let _ = ready.send(Ok(unsafe { GetCurrentThreadId() }));
            handles
        }
        Err(error) => {
            let _ = ready.send(Err(error));
            TX.with(|slot| *slot.borrow_mut() = None);
            return;
        }
    };

    let mut message = MSG::default();
    // SAFETY: a standard message pump; the handles stay valid until torn down below
    unsafe {
        // GetMessageW returns 0 on WM_QUIT and -1 on error
        while GetMessageW(&mut message, None, 0, 0).0 > 0 {
            let _ = TranslateMessage(&message);
            DispatchMessageW(&message);
        }
        let _ = UnhookWinEvent(hook);
        let _ = WTSUnRegisterSessionNotification(hwnd);
        let _ = DestroyWindow(hwnd);
    }
    TX.with(|slot| *slot.borrow_mut() = None);
}

/// # Safety
/// call once per thread; the returned handles belong to that thread
unsafe fn setup_hooks() -> Result<(HWND, HWINEVENTHOOK), String> {
    // SAFETY: plain win32 setup. the class name and the callbacks are 'static,
    // the window is message-only (no parent, no menu), and every handle
    // created here is either returned or destroyed on the failure path.
    unsafe {
        let module = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let instance: HINSTANCE = module.into();
        let class_name = w!("TallierUsageMessageWindow");
        let class = WNDCLASSW {
            lpfnWndProc: Some(wnd_proc),
            hInstance: instance,
            lpszClassName: class_name,
            ..Default::default()
        };
        // re-registering after a restart of tracking fails harmlessly: the class exists either way
        let _ = RegisterClassW(&class);

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE(0),
            class_name,
            PCWSTR::null(),
            WINDOW_STYLE(0),
            0,
            0,
            0,
            0,
            Some(HWND_MESSAGE),
            None,
            Some(instance),
            None,
        )
        .map_err(|e| e.to_string())?;

        // lock / unlock. best effort: terminal-services notifications can be unavailable
        let _ = WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION);

        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(on_foreground_event),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );
        if hook.is_invalid() {
            let _ = WTSUnRegisterSessionNotification(hwnd);
            let _ = DestroyWindow(hwnd);
            return Err("SetWinEventHook failed".to_string());
        }
        Ok((hwnd, hook))
    }
}

unsafe extern "system" fn on_foreground_event(
    _hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    _object: i32,
    _child: i32,
    _thread: u32,
    _time: u32,
) {
    if event == EVENT_SYSTEM_FOREGROUND {
        send(PlatformEvent::Foreground(resolve(hwnd)));
    }
}

unsafe extern "system" fn wnd_proc(hwnd: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match message {
        WM_WTSSESSION_CHANGE => {
            match wparam.0 as u32 {
                WTS_SESSION_LOCK => send(PlatformEvent::Lock),
                WTS_SESSION_UNLOCK => send(PlatformEvent::Unlock),
                _ => {}
            }
            LRESULT(0)
        }
        WM_POWERBROADCAST => {
            match wparam.0 as u32 {
                PBT_APMSUSPEND => send(PlatformEvent::Sleep),
                PBT_APMRESUMEAUTOMATIC | PBT_APMRESUMESUSPEND => send(PlatformEvent::Wake),
                _ => {}
            }
            LRESULT(1)
        }
        _ => unsafe { DefWindowProcW(hwnd, message, wparam, lparam) },
    }
}

fn resolve(hwnd: HWND) -> Option<ForegroundApp> {
    if hwnd.is_invalid() {
        return None;
    }
    if SHELL_CLASSES.contains(&class_name(hwnd).as_str()) {
        return None;
    }
    let mut pid = pid_of(hwnd)?;
    let mut path = exe_path(pid)?;
    // packaged (uwp) apps are hosted: the frame belongs to ApplicationFrameHost
    // and the real app owns a child window
    if stem(&path).eq_ignore_ascii_case("applicationframehost") {
        if let Some((child_pid, child_path)) = child_process(hwnd, pid).and_then(|p| exe_path(p).map(|path| (p, path))) {
            pid = child_pid;
            path = child_path;
        }
    }
    Some(ForegroundApp { id: path.to_lowercase(), name: stem(&path).to_string(), pid: pid as i32 })
}

fn stem(path: &str) -> &str {
    Path::new(path).file_stem().and_then(|s| s.to_str()).unwrap_or(path)
}

fn class_name(hwnd: HWND) -> String {
    let mut buffer = [0u16; 256];
    let length = unsafe { GetClassNameW(hwnd, &mut buffer) }.max(0) as usize;
    String::from_utf16_lossy(&buffer[..length])
}

fn pid_of(hwnd: HWND) -> Option<u32> {
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    (pid != 0).then_some(pid)
}

fn exe_path(pid: u32) -> Option<String> {
    // SAFETY: the handle is closed before returning; `len` bounds the buffer
    unsafe {
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buffer = vec![0u16; 32 * 1024];
        let mut len = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut len);
        let _ = CloseHandle(process);
        result.ok()?;
        Some(String::from_utf16_lossy(&buffer[..len as usize]))
    }
}

struct ChildSearch {
    host_pid: u32,
    found: Option<u32>,
}

unsafe extern "system" fn visit_child(hwnd: HWND, lparam: LPARAM) -> BOOL {
    // SAFETY: lparam is the `ChildSearch` that `child_process` keeps alive for
    // the whole (synchronous) enumeration
    let search = unsafe { &mut *(lparam.0 as *mut ChildSearch) };
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid != 0 && pid != search.host_pid {
        search.found = Some(pid);
        return BOOL(0);
    }
    BOOL(1)
}

fn child_process(hwnd: HWND, host_pid: u32) -> Option<u32> {
    let mut search = ChildSearch { host_pid, found: None };
    // SAFETY: `search` outlives the synchronous enumeration
    unsafe {
        let _ = EnumChildWindows(Some(hwnd), Some(visit_child), LPARAM(&mut search as *mut ChildSearch as isize));
    }
    search.found
}

/// png bytes and edge length. tries the exe's own icon at `ICON_SIZE`, then
/// the shell's 32px one.
fn extract_icon_png(path: &str) -> Option<(Vec<u8>, i64)> {
    let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
    let hicon = extract_hicon(&wide)?;
    // SAFETY: we own `hicon`; it stays live until the DestroyIcon that follows
    unsafe {
        let png = hicon_to_png(hicon);
        let _ = DestroyIcon(hicon);
        png
    }
}

fn extract_hicon(wide: &[u16]) -> Option<HICON> {
    if wide.len() <= MAX_PATH {
        let mut fixed = [0u16; MAX_PATH];
        fixed[..wide.len()].copy_from_slice(wide);
        let mut icons = [HICON(std::ptr::null_mut()); 1];
        // SAFETY: the path buffer is nul-terminated; the icon slice bounds the output
        let count = unsafe {
            PrivateExtractIconsW(&fixed, 0, ICON_SIZE as i32, ICON_SIZE as i32, Some(&mut icons), None, 0)
        };
        // u32::MAX means the file was not found
        if count != u32::MAX && count >= 1 && !icons[0].is_invalid() {
            return Some(icons[0]);
        }
    }
    let mut info = SHFILEINFOW::default();
    let ok = unsafe {
        SHGetFileInfoW(
            PCWSTR(wide.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut info),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };
    (ok != 0 && !info.hIcon.is_invalid()).then_some(info.hIcon)
}

/// # Safety
/// `hicon` must be a live icon handle
unsafe fn hicon_to_png(hicon: HICON) -> Option<(Vec<u8>, i64)> {
    // SAFETY: GetIconInfo hands out two bitmaps the caller owns; they are
    // read, then deleted, before this block ends
    unsafe {
        let mut info: ICONINFO = std::mem::zeroed();
        GetIconInfo(hicon, &mut info).ok()?;
        let png = bitmap_to_png(info.hbmColor);
        if !info.hbmColor.is_invalid() {
            let _ = DeleteObject(info.hbmColor.into());
        }
        if !info.hbmMask.is_invalid() {
            let _ = DeleteObject(info.hbmMask.into());
        }
        png
    }
}

/// # Safety
/// `hbm` must be a live bitmap handle
unsafe fn bitmap_to_png(hbm: HBITMAP) -> Option<(Vec<u8>, i64)> {
    // monochrome icons have no colour plane
    if hbm.is_invalid() {
        return None;
    }
    let mut bitmap: BITMAP = unsafe { std::mem::zeroed() };
    let written = unsafe { GetObjectW(hbm.into(), std::mem::size_of::<BITMAP>() as i32, Some(&mut bitmap as *mut BITMAP as *mut c_void)) };
    if written == 0 {
        return None;
    }
    let (width, height) = (bitmap.bmWidth, bitmap.bmHeight);
    if width <= 0 || height <= 0 || width > 1024 || height > 1024 {
        return None;
    }

    let mut info: BITMAPINFO = unsafe { std::mem::zeroed() };
    info.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: width,
        biHeight: -height, // negative height: top-down rows
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    let mut pixels = vec![0u8; width as usize * height as usize * 4];
    // SAFETY: the pixel buffer holds width * height 32bpp pixels; the dc is released after
    let lines = unsafe {
        let hdc = GetDC(None);
        let lines = GetDIBits(hdc, hbm, 0, height as u32, Some(pixels.as_mut_ptr() as *mut c_void), &mut info, DIB_RGB_COLORS);
        ReleaseDC(None, hdc);
        lines
    };
    if lines <= 0 {
        return None;
    }

    // gdi hands out bgra. icons without an alpha plane arrive fully
    // transparent; treat those as opaque.
    for px in pixels.chunks_exact_mut(4) {
        px.swap(0, 2);
    }
    if pixels.chunks_exact(4).all(|px| px[3] == 0) {
        for px in pixels.chunks_exact_mut(4) {
            px[3] = 255;
        }
    }

    let image = image::RgbaImage::from_raw(width as u32, height as u32, pixels)?;
    let mut out = std::io::Cursor::new(Vec::new());
    image.write_to(&mut out, image::ImageFormat::Png).ok()?;
    Some((out.into_inner(), i64::from(width)))
}
