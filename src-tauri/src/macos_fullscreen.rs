// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! macOS: forward NSWindow full-screen transition notifications to the webview so the
//! header traffic-light spacer can update in sync with the system controls (see tauri#7162).

use block2::RcBlock;
use objc2::runtime::AnyObject;
use objc2_app_kit::{
    NSWindowDidEnterFullScreenNotification, NSWindowDidExitFullScreenNotification,
    NSWindowWillEnterFullScreenNotification, NSWindowWillExitFullScreenNotification,
};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSOperationQueue};
use std::ptr::NonNull;
use tauri::{AppHandle, Emitter, Manager};
use tauri::Result as TauriResult;

#[derive(Clone, serde::Serialize)]
struct MacosFullscreenPayload {
    phase: &'static str,
}

/// Register AppKit observers for the main window. Safe to call once at startup on the main thread.
pub fn attach(app: &AppHandle) -> TauriResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| tauri::Error::WindowNotFound)?;
    let ns_ptr = window.ns_window()?;
    let window_obj = unsafe { &*ns_ptr.cast::<AnyObject>() };

    let center = NSNotificationCenter::defaultCenter();
    let main_queue = NSOperationQueue::mainQueue();

    // AppKit extern statics; documented as process-lifetime NSString constants.
    let pairs = unsafe {
        [
            (NSWindowWillExitFullScreenNotification, "will-exit"),
            (NSWindowDidExitFullScreenNotification, "did-exit"),
            (NSWindowWillEnterFullScreenNotification, "will-enter"),
            (NSWindowDidEnterFullScreenNotification, "did-enter"),
        ]
    };

    for (name, phase) in pairs {
        let app = app.clone();
        let block = RcBlock::new(move |_note: NonNull<NSNotification>| {
            let _ = app.emit(
                "macos-fullscreen",
                MacosFullscreenPayload { phase },
            );
        });

        unsafe {
            let _obs = center.addObserverForName_object_queue_usingBlock(
                Some(name),
                Some(window_obj),
                Some(&*main_queue),
                &*block,
            );
            std::mem::forget(_obs);
        }
    }

    Ok(())
}
