// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! SDF validation commands — Faz 3.
//!
//! Two commands:
//!   `validate_sdf_signature`       — fast MVP badge (metadata check, kept for compat)
//!   `validate_sdf_full`            — full cryptographic pipeline (Faz 3)

use crate::error::AppError;
use crate::sdf::validator::{validate_sdf, ValidateOptions, FullValidationResult};

// ─── validate_sdf_full ────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct ValidateFullArgs {
    pub path: String,
    /// Base64 SPKI public key — required for "self_signed" mode verification.
    /// For "x509" mode the embedded certificate is used; this field can be None.
    pub trusted_public_key_b64: Option<String>,
    /// Algorithm hint — "ECDSA" or "RSASSA-PKCS1-v1_5". Defaults to "ECDSA".
    pub algorithm: Option<String>,
}

/// Full cryptographic SDF signature validation.
#[tauri::command]
pub async fn validate_sdf_full(args: ValidateFullArgs) -> Result<FullValidationResult, AppError> {
    let path = args.path.trim();
    if path.is_empty() {
        return Err(AppError::Parse("path is empty".into()));
    }

    let opts = ValidateOptions {
        trusted_public_key_b64: args.trusted_public_key_b64.as_deref(),
        algorithm:              args.algorithm.as_deref(),
    };

    validate_sdf(path, opts)
}

// ─── validate_sdf_signature (MVP compat, kept) ───────────────────────────────

#[derive(serde::Serialize)]
pub struct SignatureValidation {
    pub status: String,
    pub reason: Option<String>,
}

/// Lightweight metadata-based signature check.
/// Kept for backward compat — UI that needs the full result should call `validate_sdf_full`.
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
    let text  = String::from_utf8_lossy(&bytes);

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
