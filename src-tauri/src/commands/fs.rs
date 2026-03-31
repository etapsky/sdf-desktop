// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use crate::error::AppError;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub async fn read_sdf_file(path: String) -> Result<Vec<u8>, AppError> {
    let bytes = std::fs::read(&path).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(bytes)
}

#[tauri::command]
pub async fn get_file_metadata(path: String) -> Result<serde_json::Value, AppError> {
    let meta = std::fs::metadata(&path).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(serde_json::json!({
        "size": meta.len(),
        "modified": meta.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs()),
        "is_file": meta.is_file(),
    }))
}

#[tauri::command]
pub async fn write_temp_sdf_file(data: Vec<u8>, filename: String) -> Result<String, AppError> {
    let clean_name = filename
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect::<String>();
    let safe_name = if clean_name.to_lowercase().ends_with(".sdf") {
        clean_name
    } else {
        format!("{clean_name}.sdf")
    };
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Io(e.to_string()))?
        .as_millis();

    let mut dir = std::env::temp_dir();
    dir.push("etapsky");
    dir.push("cloud-cache");
    std::fs::create_dir_all(&dir).map_err(|e| AppError::Io(e.to_string()))?;

    let mut file_path = PathBuf::from(dir);
    file_path.push(format!("{ts}-{safe_name}"));
    std::fs::write(&file_path, data).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(file_path.to_string_lossy().into_owned())
}
