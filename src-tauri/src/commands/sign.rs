// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! SDF signing commands — Faz 3.
//!
//! Commands exposed to the frontend:
//!   `list_signing_certificates`    — enumerate OS cert store
//!   `sign_sdf_with_certificate`    — sign using an OS X.509 cert (x509 path)
//!   `sign_sdf_document`            — stub kept for backward compat (self_signed
//!                                    path is handled entirely in TS via sdf-kit)

use crate::error::AppError;
use crate::sdf::certstore::list_signing_certificates;
use crate::sdf::{CertInfo, SignerInfo};
use crate::sdf::signer::{sign_sdf_with_certificate, SignOptions};

use std::path::Path;

// ─── list_signing_certificates ───────────────────────────────────────────────

/// Enumerate all signing identities available in the OS certificate store.
#[tauri::command]
pub async fn list_signing_certificates_cmd() -> Result<Vec<CertInfo>, AppError> {
    list_signing_certificates()
}

// ─── sign_sdf_with_certificate ────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct SignWithCertArgs {
    pub path:        String,
    pub fingerprint: String,
    /// "ECDSA" | "RSASSA-PKCS1-v1_5"
    pub algorithm:   Option<String>,
    pub include_pdf: Option<bool>,
    pub include_tsa: Option<bool>,
    pub tsa_url:     Option<String>,
}

#[derive(serde::Serialize)]
pub struct SignWithCertResult {
    pub status:         String,
    pub signed_at:      Option<String>,
    pub content_digest: Option<String>,
    pub signer_info:    Option<SignerInfo>,
}

/// Sign an SDF file with an OS-stored certificate. Mutates the file in place.
#[tauri::command]
pub async fn sign_sdf_with_certificate_cmd(
    args: SignWithCertArgs,
) -> Result<SignWithCertResult, AppError> {
    let path = args.path.trim().to_owned();
    if path.is_empty() {
        return Err(AppError::Parse("path is empty".into()));
    }
    if !path.to_lowercase().ends_with(".sdf") {
        return Ok(SignWithCertResult {
            status:         "unsupported".to_owned(),
            signed_at:      None,
            content_digest: None,
            signer_info:    None,
        });
    }
    if !Path::new(&path).is_file() {
        return Err(AppError::NotFound(path.clone()));
    }

    let opts = SignOptions {
        path:        &path,
        fingerprint: args.fingerprint.trim(),
        algorithm:   args.algorithm.as_deref().unwrap_or("ECDSA"),
        include_pdf: args.include_pdf.unwrap_or(true),
        include_tsa: args.include_tsa.unwrap_or(false),
        tsa_url:     args.tsa_url.clone(),
    };

    let result = sign_sdf_with_certificate(opts).await?;

    Ok(SignWithCertResult {
        status:         "signed".to_owned(),
        signed_at:      Some(result.signed_at),
        content_digest: Some(result.content_digest),
        signer_info:    Some(result.signer_info),
    })
}

// ─── sign_sdf_document (backward compat stub) ────────────────────────────────
// The self_signed path is fully handled in TypeScript (sdf-kit + OS keychain).
// This stub exists so the Tauri invoke registry is consistent.

#[derive(serde::Serialize)]
pub struct SignSdfResult {
    pub status:  String,
    pub message: String,
}

#[tauri::command]
pub async fn sign_sdf_document(path: String) -> Result<SignSdfResult, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("path is empty".into()));
    }
    if !trimmed.to_lowercase().ends_with(".sdf") {
        return Ok(SignSdfResult {
            status:  "unsupported".to_owned(),
            message: "only_sdf_files_can_be_signed".to_owned(),
        });
    }
    if !Path::new(trimmed).is_file() {
        return Err(AppError::NotFound(trimmed.to_owned()));
    }
    // Self-signed path is handled in TypeScript.
    Ok(SignSdfResult {
        status:  "not_implemented".to_owned(),
        message: "self_signed_handled_by_frontend".to_owned(),
    })
}
