// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use tauri::{Emitter, Manager};

mod commands;
mod error;

#[cfg(target_os = "macos")]
mod macos_fullscreen;

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
        .setup(|app| {
            #[cfg(target_os = "macos")]
            if let Err(e) = macos_fullscreen::attach(app.handle()) {
                eprintln!("[macos_fullscreen] failed to attach observers: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_sdf_file,
            commands::fs::get_file_metadata,
            commands::open::get_launch_sdf_paths,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
