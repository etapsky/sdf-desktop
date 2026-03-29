// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

/// CLI argv fragments that look like `.sdf` file paths (skip flags).
pub fn sdf_paths_from_argv(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1)
        .filter(|s| {
            let t = s.trim();
            !t.is_empty()
                && !t.starts_with('-')
                && t.to_lowercase().ends_with(".sdf")
        })
        .cloned()
        .collect()
}

/// Returns pending `.sdf` paths collected at launch (argv or macOS Finder open)
/// and drains them so they are delivered only once.
///
/// The frontend calls this once on startup. Subsequent opens while the app is
/// already running are delivered via the `sdf-open-paths` event.
#[tauri::command]
pub fn get_launch_sdf_paths(state: tauri::State<'_, crate::AppState>) -> Vec<String> {
    let mut paths = state.pending_sdf_paths.lock().unwrap();
    let result = paths.clone();
    paths.clear();
    result
}
