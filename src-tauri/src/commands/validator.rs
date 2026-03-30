// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use crate::error::AppError;

#[derive(serde::Serialize)]
pub struct SignatureValidation {
    pub status: String, // valid | invalid | unsigned
    pub reason: Option<String>,
}

/// MVP signature validation.
///
/// NOTE:
/// - Full cryptographic validation pipeline will live under `src-tauri/src/sdf/validator.rs`.
/// - For now, we classify based on SDF metadata markers inside the container bytes.
#[tauri::command]
pub async fn validate_sdf_signature(path: String) -> Result<SignatureValidation, AppError> {
    let lower = path.to_lowercase();
    if lower.ends_with(".pdf") {
        return Ok(SignatureValidation {
            status: "unsigned".into(),
            reason: Some("plain_pdf".into()),
        });
    }

    let bytes = std::fs::read(&path).map_err(|e| AppError::Io(e.to_string()))?;
    let text = String::from_utf8_lossy(&bytes);

    // Very lightweight marker checks for phase-1 UI badge.
    if text.contains("\"signature_algorithm\"") {
        if text.contains("\"signature_algorithm\":null")
            || text.contains("\"signature_algorithm\": null")
        {
            return Ok(SignatureValidation {
                status: "unsigned".into(),
                reason: Some("signature_algorithm_null".into()),
            });
        }
        return Ok(SignatureValidation {
            status: "valid".into(),
            reason: Some("signature_algorithm_present".into()),
        });
    }

    Ok(SignatureValidation {
        status: "unsigned".into(),
        reason: Some("signature_metadata_missing".into()),
    })
}

