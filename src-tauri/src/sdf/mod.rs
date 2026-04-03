// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! SDF native cryptographic subsystem — Faz 3 Digital Signatures.
//!
//! Modules:
//! - `certstore` — Cross-platform OS certificate enumeration
//! - `signer`    — Native SDF signing pipeline (X.509 certs + self-signed fallback)
//! - `validator` — Full cryptographic validation pipeline
//! - `tsa`       — RFC 3161 Time-Stamp Authority client

pub mod certstore;
pub mod signer;
pub mod tsa;
pub mod validator;

// ─── Shared Types ─────────────────────────────────────────────────────────────

use serde::{Deserialize, Serialize};

/// Information about a certificate available for signing.
/// Returned by `certstore::list_signing_certificates()`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertInfo {
    /// SHA-256 fingerprint of the DER certificate, hex-encoded.
    /// Used as the stable identifier for cert selection.
    pub fingerprint_sha256: String,
    pub common_name: Option<String>,
    pub email: Option<String>,
    pub organization: Option<String>,
    pub country: Option<String>,
    /// Issuer distinguished name string.
    pub issuer: String,
    /// Certificate validity window (ISO 8601 / RFC 3339).
    pub not_before: String,
    pub not_after: String,
    pub is_expired: bool,
    pub is_self_signed: bool,
    /// Key type string, e.g. "ECDSA-P256", "RSA-2048".
    pub key_algorithm: String,
}

/// Identity metadata embedded in `signature.sig`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignerInfo {
    /// "x509" when signed with an OS certificate; "self_signed" for keychain keypair.
    pub mode: String,
    pub common_name: Option<String>,
    pub email: Option<String>,
    pub organization: Option<String>,
    pub issuer_name: Option<String>,
    /// DER-encoded signing certificate, base64.
    pub certificate_der_b64: Option<String>,
    /// SHA-256 fingerprint of the signing cert, hex.
    pub cert_fingerprint_sha256: Option<String>,
    pub not_before: Option<String>,
    pub not_after: Option<String>,
    /// RFC 3161 TimeStampResponse, base64. Present when TSA was called.
    pub tsa_token_b64: Option<String>,
    /// genTime extracted from TSTInfo (ISO 8601).
    pub tsa_signed_at: Option<String>,
    /// ECDSA signature encoding: "p1363" or "der". Absent → "p1363".
    pub signature_encoding: Option<String>,
    /// SPKI public key (base64) — present for "self_signed" mode.
    /// Embedded so the file is self-verifiable without keychain access.
    pub public_key_spki_b64: Option<String>,
}

/// The full `signature.sig` payload.
#[derive(Debug, Serialize, Deserialize)]
pub struct SigPayload {
    pub algorithm: String,
    pub signed_at: String,
    pub content_digest: String,
    pub include_pdf: bool,
    pub signature: String,
    pub meta_snapshot: Option<String>,
    pub signer_info: Option<SignerInfo>,
}
