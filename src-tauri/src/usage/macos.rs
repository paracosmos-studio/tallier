// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! appkit backend. `NSWorkspace` notifications for app activation, sleep,
//! wake and session switches; `NSRunningApplication` for identity and icon.
//! none of it needs a tcc permission or an entitlement, so it runs inside the
//! app store sandbox. observers are registered and removed on the main thread
//! and their tokens live in a thread-local there, because `Retained` is not
//! `Send`.

use std::cell::RefCell;
use std::ptr::NonNull;
use std::sync::Arc;
use std::sync::mpsc::Sender;

use block2::RcBlock;
use objc2::AnyThread;
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, NSObjectProtocol, ProtocolObject};
use objc2_app_kit::{
    NSBitmapImageFileType, NSBitmapImageRep, NSCalibratedRGBColorSpace, NSCompositingOperation, NSGraphicsContext,
    NSRunningApplication, NSWorkspace, NSWorkspaceApplicationKey, NSWorkspaceDidActivateApplicationNotification,
    NSWorkspaceDidWakeNotification, NSWorkspaceSessionDidBecomeActiveNotification,
    NSWorkspaceSessionDidResignActiveNotification, NSWorkspaceWillSleepNotification,
};
use objc2_core_foundation::{CGPoint, CGRect, CGSize};
use objc2_foundation::{NSDictionary, NSNotification, NSNotificationCenter, NSNotificationName, NSOperationQueue};

use super::platform::{ForegroundApp, ICON_SIZE, MainThread, Platform, PlatformEvent};

type Token = Retained<ProtocolObject<dyn NSObjectProtocol>>;

thread_local! {
    static OBSERVERS: RefCell<Vec<Token>> = const { RefCell::new(Vec::new()) };
}

pub(crate) struct MacPlatform {
    main: Option<Arc<dyn MainThread>>,
}

impl MacPlatform {
    pub(crate) fn new() -> Self {
        Self { main: None }
    }
}

fn describe(app: &NSRunningApplication) -> Option<ForegroundApp> {
    // bundle id is the stable identity; bare executables (no bundle) fall back
    // to their path
    let id = app
        .bundleIdentifier()
        .map(|s| s.to_string())
        .or_else(|| app.executableURL().and_then(|url| url.path()).map(|p| p.to_string()))?;
    let name = app
        .localizedName()
        .map(|s| s.to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| id.clone());
    Some(ForegroundApp { id, name, pid: app.processIdentifier() })
}

fn app_from_notification(notification: &NSNotification) -> Option<ForegroundApp> {
    let info = notification.userInfo()?;
    let key: &AnyObject = unsafe { NSWorkspaceApplicationKey };
    let app = info.objectForKey(key)?.downcast::<NSRunningApplication>().ok()?;
    describe(&app)
}

/// # Safety
/// must run on the main thread; `map` and `tx` cross to the main thread's
/// operation queue, so the block captures only `Send` values
unsafe fn observe(
    center: &NSNotificationCenter,
    name: &NSNotificationName,
    tx: Sender<PlatformEvent>,
    map: impl Fn(&NSNotification) -> Option<PlatformEvent> + Send + 'static,
) -> Token {
    let block = RcBlock::new(move |notification: NonNull<NSNotification>| {
        // SAFETY: appkit hands a live notification for the duration of the callback
        let notification = unsafe { notification.as_ref() };
        if let Some(event) = map(notification) {
            let _ = tx.send(event);
        }
    });
    // SAFETY: the caller is on the main thread and the block is sendable
    unsafe { center.addObserverForName_object_queue_usingBlock(Some(name), None, Some(&NSOperationQueue::mainQueue()), &block) }
}

/// draws the app's icon into a square bitmap and encodes png. main thread
/// only: it swaps the current graphics context.
fn render_icon(pid: i32) -> Option<Vec<u8>> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    let image = app.icon()?;
    let edge = ICON_SIZE as isize;

    // SAFETY: null planes ask appkit to allocate the buffer; the colour space
    // name is an appkit export
    let rep = unsafe {
        NSBitmapImageRep::initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(
            NSBitmapImageRep::alloc(),
            std::ptr::null_mut(),
            edge,
            edge,
            8,
            4,
            true,
            false,
            NSCalibratedRGBColorSpace,
            0,
            0,
        )
    }?;
    let context = NSGraphicsContext::graphicsContextWithBitmapImageRep(&rep)?;

    let target = CGRect::new(CGPoint::new(0.0, 0.0), CGSize::new(edge as f64, edge as f64));
    // a zero source rect means the whole image
    let whole = CGRect::new(CGPoint::new(0.0, 0.0), CGSize::new(0.0, 0.0));

    let previous = NSGraphicsContext::currentContext();
    NSGraphicsContext::saveGraphicsState_class();
    NSGraphicsContext::setCurrentContext(Some(&context));
    image.drawInRect_fromRect_operation_fraction(target, whole, NSCompositingOperation::Copy, 1.0);
    NSGraphicsContext::restoreGraphicsState_class();
    NSGraphicsContext::setCurrentContext(previous.as_deref());

    let properties = NSDictionary::new();
    let data = unsafe { rep.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties) }?;
    Some(data.to_vec())
}

impl Platform for MacPlatform {
    fn start(&mut self, main: Arc<dyn MainThread>, tx: Sender<PlatformEvent>) -> Result<(), String> {
        self.main = Some(main.clone());
        main.run(Box::new(move || {
            let center = NSWorkspace::sharedWorkspace().notificationCenter();
            // SAFETY: this closure runs on the main thread (MainThread contract);
            // the notification names are appkit exports
            let tokens = unsafe {
                vec![
                    observe(&center, NSWorkspaceDidActivateApplicationNotification, tx.clone(), |n| {
                        Some(PlatformEvent::Foreground(app_from_notification(n)))
                    }),
                    observe(&center, NSWorkspaceWillSleepNotification, tx.clone(), |_| Some(PlatformEvent::Sleep)),
                    observe(&center, NSWorkspaceDidWakeNotification, tx.clone(), |_| Some(PlatformEvent::Wake)),
                    // fast user switching: our session leaves / regains the console
                    observe(&center, NSWorkspaceSessionDidResignActiveNotification, tx.clone(), |_| Some(PlatformEvent::Lock)),
                    observe(&center, NSWorkspaceSessionDidBecomeActiveNotification, tx, |_| Some(PlatformEvent::Unlock)),
                ]
            };
            OBSERVERS.with(|observers| observers.borrow_mut().extend(tokens));
        }))
    }

    fn poll_foreground(&self) -> Option<ForegroundApp> {
        // NSWorkspace and NSRunningApplication are thread-safe reads
        let app = NSWorkspace::sharedWorkspace().frontmostApplication()?;
        describe(&app)
    }

    fn request_icon(&self, app: &ForegroundApp, tx: Sender<PlatformEvent>) {
        let Some(main) = self.main.clone() else { return };
        let pid = app.pid;
        let app_id = app.id.clone();
        let fallback = (app.id.clone(), tx.clone());
        let queued = main.run(Box::new(move || {
            let png = render_icon(pid);
            let _ = tx.send(PlatformEvent::Icon { app_id, png, size: ICON_SIZE });
        }));
        if queued.is_err() {
            let _ = fallback.1.send(PlatformEvent::Icon { app_id: fallback.0, png: None, size: ICON_SIZE });
        }
    }

    fn stop(&mut self) {
        let Some(main) = self.main.take() else { return };
        let _ = main.run(Box::new(|| {
            let center = NSWorkspace::sharedWorkspace().notificationCenter();
            OBSERVERS.with(|observers| {
                for token in observers.borrow_mut().drain(..) {
                    // SAFETY: main thread; the token came from addObserver above
                    unsafe { center.removeObserver(token.as_ref()) };
                }
            });
        }));
    }
}
