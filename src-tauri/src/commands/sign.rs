// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Local SDF signing command surface.
//!
//! Cryptographic signing (CMS/PKCS#7, certificate selection) will plug in here in Faz 3
//! (`src-tauri/src/sdf/signer.rs`). The IPC contract is stable from Faz 1c onward.

use crate::error::AppError;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct SignSdfResult {
    /// `signed` | `not_implemented` | `unsupported`
    pub status: String,
    pub message: String,
}

/// Attempt to sign an SDF file on disk.
///
/// Returns `Ok` for expected outcomes (including “not implemented yet”); `Err` for I/O / invalid input.
#[tauri::command]
pub async fn sign_sdf_document(path: String) -> Result<SignSdfResult, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("path is empty".into()));
    }

    let lower = trimmed.to_lowercase();
    if !lower.ends_with(".sdf") {
        return Ok(SignSdfResult {
            status: "unsupported".into(),
            message: "only_sdf_files_can_be_signed".into(),
        });
    }

    let p = Path::new(trimmed);
    if !p.exists() {
        return Err(AppError::NotFound(trimmed.to_string()));
    }
    if !p.is_file() {
        return Err(AppError::Parse("path is not a regular file".into()));
    }

    // TODO(Faz 3): integrate `sdf/signer.rs` — load cert, build detached signature, rewrite container.
    Ok(SignSdfResult {
        status: "not_implemented".into(),
        message: "local_signing_not_yet_available".into(),
    })
}
