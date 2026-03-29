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

/// First-process launch: argv still available (e.g. user opened `file.sdf` from Finder).
#[tauri::command]
pub fn get_launch_sdf_paths() -> Vec<String> {
    sdf_paths_from_argv(&std::env::args().collect::<Vec<_>>())
}
