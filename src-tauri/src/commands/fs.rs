// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use crate::error::AppError;

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
