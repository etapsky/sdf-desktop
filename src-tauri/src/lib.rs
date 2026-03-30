// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use std::sync::Mutex;
use tauri::{Emitter, Manager};

mod commands;
mod error;

#[cfg(target_os = "macos")]
mod macos_fullscreen;

/// Paths of `.sdf` files that need to be opened.
///
/// Populated from two sources:
/// 1. argv at launch (terminal / Windows shell open)
/// 2. `RunEvent::Opened` — macOS Finder double-click / "Open With"
///
/// The frontend drains this on startup via `get_launch_sdf_paths`.
/// Subsequent opens while the app is already running are delivered via
/// the `sdf-open-paths` event instead.
pub struct AppState {
    pub pending_sdf_paths: Mutex<Vec<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            pending_sdf_paths: Mutex::new(Vec::new()),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let _ = app
                .get_webview_window("main")
                .map(|w| w.set_focus());
            let paths = commands::open::sdf_paths_from_argv(&argv);
            if !paths.is_empty() {
                let _ = app.emit(
                    "sdf-open-paths",
                    serde_json::json!({ "paths": paths }),
                );
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::default())
        .setup(|app| {
            // Seed pending paths from argv (terminal launch with a .sdf argument).
            // On macOS, Finder double-clicks arrive via RunEvent::Opened — not argv.
            let argv_paths =
                commands::open::sdf_paths_from_argv(&std::env::args().collect::<Vec<_>>());
            if !argv_paths.is_empty() {
                app.state::<AppState>()
                    .pending_sdf_paths
                    .lock()
                    .unwrap()
                    .extend(argv_paths);
            }

            #[cfg(target_os = "macos")]
            if let Err(e) = macos_fullscreen::attach(app.handle()) {
                eprintln!("[macos_fullscreen] failed to attach observers: {e}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_sdf_file,
            commands::fs::get_file_metadata,
            commands::keychain::keychain_set_refresh_token,
            commands::keychain::keychain_get_refresh_token,
            commands::keychain::keychain_delete_refresh_token,
            commands::open::get_launch_sdf_paths,
            commands::sign::sign_sdf_document,
            commands::validator::validate_sdf_signature,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS: Finder double-click / "Open With" delivers file URLs here,
            // NOT via argv. This also fires when a .sdf is opened while the app
            // is already running.
            if let tauri::RunEvent::Opened { urls } = &event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter(|p| {
                        p.extension()
                            .map(|e| e.eq_ignore_ascii_case("sdf"))
                            .unwrap_or(false)
                    })
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();

                if paths.is_empty() {
                    return;
                }

                // Store so the frontend can drain them with get_launch_sdf_paths.
                if let Some(state) = app.try_state::<AppState>() {
                    state.pending_sdf_paths.lock().unwrap().extend(paths.clone());
                }

                // Also emit directly — works when the frontend is already ready
                // (e.g. user opens a second file while the app is running).
                let _ = app.emit("sdf-open-paths", serde_json::json!({ "paths": paths }));
            }
        });
}
