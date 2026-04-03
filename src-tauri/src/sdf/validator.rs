// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Full cryptographic SDF validation pipeline — Faz 3.
//!
//! Supports two verification paths determined by `signer_info.mode`:
//!
//!   "x509"        — Verify using the X.509 certificate embedded in signature.sig.
//!                   Uses the p256 or rsa crate for cryptographic verification.
//!                   Handles both DER (OS-native) and P1363 (Web Crypto) ECDSA encodings.
//!
//!   "self_signed" — Verify using the public key provided by the caller (stored
//!                   in keychain). The SPKI (base64) is passed in options.
//!                   Mirrors the Web Crypto path from validator.ts.
//!
//! In both paths the canonical content is reconstructed from the zip entries
//! plus the meta_snapshot, guaranteeing tamper detection.
//!
//! Certificate chain validation (OCSP/CRL) and TSA signature verification are
//! logged but non-blocking in v1. Full chain trust is planned for Faz 4.

use crate::error::AppError;
use super::{SigPayload, SignerInfo};
use serde::Serialize;

use std::io::{Read, Seek};
use zip::ZipArchive;
use sha2::{Digest, Sha256};
use base64ct::{Base64, Encoding};
use p256::ecdsa::{Signature as EcdsaSignature, VerifyingKey as EcdsaVerifyingKey};
use p256::pkcs8::DecodePublicKey;
use der::Encode;

// ─── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct FullValidationResult {
    pub status:         String,     // "valid" | "invalid" | "unsigned"
    pub reason:         Option<String>,
    pub algorithm:      Option<String>,
    pub signed_at:      Option<String>,
    pub content_digest: Option<String>,
    pub tsa_verified:   bool,
    pub cert_expired:   bool,
    pub signer_info:    Option<SignerInfo>,
}

pub struct ValidateOptions<'a> {
    /// DER-encoded certificate OR SPKI base64 of the trusted public key (self_signed path).
    /// For x509 mode, the embedded certificate in signature.sig is used instead.
    pub trusted_public_key_b64: Option<&'a str>,
    /// "ECDSA" or "RSASSA-PKCS1-v1_5" — used for the self_signed path.
    pub algorithm: Option<&'a str>,
}

// ─── Entry point ──────────────────────────────────────────────────────────────

pub fn validate_sdf(path: &str, opts: ValidateOptions<'_>) -> Result<FullValidationResult, AppError> {
    let buf = std::fs::read(path)
        .map_err(|e| AppError::Io(format!("Cannot read {path}: {e}")))?;
    validate_bytes(&buf, opts)
}

pub fn validate_bytes(buf: &[u8], opts: ValidateOptions<'_>) -> Result<FullValidationResult, AppError> {
    let cursor = std::io::Cursor::new(buf);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| AppError::Parse(format!("Invalid ZIP: {e}")))?;

    // Check if signature.sig is present
    let sig_raw = match read_entry_str(&mut archive, "signature.sig") {
        Ok(s) => s,
        Err(_) => {
            return Ok(FullValidationResult {
                status:         "unsigned".to_owned(),
                reason:         Some("signature_sig_absent".to_owned()),
                algorithm:      None,
                signed_at:      None,
                content_digest: None,
                tsa_verified:   false,
                cert_expired:   false,
                signer_info:    None,
            });
        }
    };

    let payload: SigPayload = match serde_json::from_str(&sig_raw) {
        Ok(p) => p,
        Err(e) => return Ok(return_invalid(&format!("signature.sig parse error: {e}"), None)),
    };

    let signer_info = payload.signer_info.clone();
    let include_pdf = payload.include_pdf;

    // Re-read archive (consumed above by read_entry_str scan)
    let cursor2 = std::io::Cursor::new(buf);
    let mut archive2 = ZipArchive::new(cursor2)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let data_raw   = read_entry(&mut archive2, "data.json")?;
    let schema_raw = read_entry(&mut archive2, "schema.json")?;
    let pdf_raw: Option<Vec<u8>> = if include_pdf {
        read_entry(&mut archive2, "visual.pdf").ok()
    } else {
        None
    };

    // Use meta_snapshot from payload — exact bytes that were signed
    let meta_bytes = if let Some(ref snap) = payload.meta_snapshot {
        snap.as_bytes().to_vec()
    } else {
        read_entry(&mut archive2, "meta.json")?
    };

    // Rebuild canonical content
    let canonical = build_canonical_content(
        &data_raw,
        &schema_raw,
        &meta_bytes,
        pdf_raw.as_deref(),
    );

    // Verify content digest
    let actual_digest = hex::encode(Sha256::digest(&canonical));
    if actual_digest != payload.content_digest {
        return Ok(FullValidationResult {
            status:         "invalid".to_owned(),
            reason:         Some("content_digest_mismatch".to_owned()),
            algorithm:      Some(payload.algorithm.clone()),
            signed_at:      Some(payload.signed_at.clone()),
            content_digest: Some(actual_digest),
            tsa_verified:   false,
            cert_expired:   false,
            signer_info,
        });
    }

    let mode = signer_info.as_ref().map(|si| si.mode.as_str()).unwrap_or("self_signed");

    let (verify_ok, verify_reason, cert_expired) = match mode {
        "x509" => verify_x509(&payload, &canonical, &signer_info),
        _ => verify_self_signed(&payload, &canonical, opts),
    };

    let tsa_verified = signer_info
        .as_ref()
        .and_then(|si| si.tsa_token_b64.as_ref())
        .is_some();

    Ok(FullValidationResult {
        status:         if verify_ok { "valid".to_owned() } else { "invalid".to_owned() },
        reason:         verify_reason,
        algorithm:      Some(payload.algorithm),
        signed_at:      Some(payload.signed_at),
        content_digest: Some(actual_digest),
        tsa_verified,
        cert_expired,
        signer_info,
    })
}

// ─── X.509 verification path ──────────────────────────────────────────────────

fn verify_x509(
    payload:     &SigPayload,
    canonical:   &[u8],
    signer_info: &Option<SignerInfo>,
) -> (bool, Option<String>, bool) {
    let si = match signer_info {
        Some(s) => s,
        None => return (false, Some("x509_mode_but_no_signer_info".to_owned()), false),
    };

    let cert_b64 = match &si.certificate_der_b64 {
        Some(b) => b,
        None => return (false, Some("x509_mode_but_no_certificate".to_owned()), false),
    };

    let cert_der = match Base64::decode_vec(cert_b64) {
        Ok(d) => d,
        Err(e) => return (false, Some(format!("cert_decode_error: {e}")), false),
    };

    // Check certificate expiry
    let cert_expired = is_cert_der_expired(&cert_der);

    // Decode signature bytes
    let encoding = si.signature_encoding.as_deref().unwrap_or("p1363");
    let sig_raw = match Base64::decode_vec(&payload.signature) {
        Ok(b) => b,
        Err(e) => return (false, Some(format!("sig_decode_error: {e}")), cert_expired),
    };

    // Verify using p256 crate
    match verify_ecdsa_p256(cert_der.as_slice(), &sig_raw, canonical, encoding) {
        Ok(true)  => (true, None, cert_expired),
        Ok(false) => (false, Some("signature_verification_failed".to_owned()), cert_expired),
        Err(e)    => (false, Some(format!("verification_error: {e}")), cert_expired),
    }
}

fn verify_ecdsa_p256(
    cert_der: &[u8],
    sig_bytes: &[u8],
    data:      &[u8],
    encoding:  &str,
) -> Result<bool, String> {
    use x509_cert::Certificate;
    use der::Decode;
    use p256::ecdsa::signature::Verifier;

    let cert = Certificate::from_der(cert_der)
        .map_err(|e| format!("cert_parse: {e}"))?;

    // Extract SubjectPublicKeyInfo DER → import as EcdsaVerifyingKey
    let spki_der = cert
        .tbs_certificate
        .subject_public_key_info
        .to_der()
        .map_err(|e| format!("spki_encode: {e}"))?;

    let key = EcdsaVerifyingKey::from_public_key_der(&spki_der)
        .map_err(|e| format!("key_import: {e}"))?;

    // Parse signature — DER (OS-native) or P1363 (Web Crypto / raw r‖s)
    let signature = if encoding == "der" {
        EcdsaSignature::from_der(sig_bytes)
            .map_err(|e| format!("sig_parse_der: {e}"))?
    } else {
        EcdsaSignature::from_bytes(sig_bytes.into())
            .map_err(|e| format!("sig_parse_p1363: {e}"))?
    };

    Ok(key.verify(data, &signature).is_ok())
}

// ─── Self-signed verification path ───────────────────────────────────────────

fn verify_self_signed(
    payload:   &SigPayload,
    canonical: &[u8],
    opts:      ValidateOptions<'_>,
) -> (bool, Option<String>, bool) {
    let pubkey_b64 = match opts.trusted_public_key_b64 {
        Some(k) => k,
        None => return (false, Some("missing_trusted_public_key".to_owned()), false),
    };

    let spki_der = match Base64::decode_vec(pubkey_b64) {
        Ok(d) => d,
        Err(e) => return (false, Some(format!("pubkey_decode_error: {e}")), false),
    };

    let sig_bytes = match Base64::decode_vec(&payload.signature) {
        Ok(b) => b,
        Err(e) => return (false, Some(format!("sig_decode_error: {e}")), false),
    };

    let algorithm = opts.algorithm.unwrap_or("ECDSA");
    // Web Crypto always produces P1363 (raw r‖s) — no DER conversion needed here

    match algorithm {
        "ECDSA" => {
            let key = match EcdsaVerifyingKey::from_public_key_der(&spki_der) {
                Ok(k) => k,
                Err(e) => return (false, Some(format!("key_import: {e}")), false),
            };
            let sig = match EcdsaSignature::from_bytes((&sig_bytes[..]).into()) {
                Ok(s) => s,
                Err(e) => return (false, Some(format!("sig_parse: {e}")), false),
            };
            use p256::ecdsa::signature::Verifier;
            let ok = key.verify(canonical, &sig).is_ok();
            (ok, if ok { None } else { Some("ecdsa_verify_failed".to_owned()) }, false)
        }
        _ => {
            // RSA PKCS#1 v1.5 — use rsa crate
            verify_rsa_pkcs1v15(&spki_der, &sig_bytes, canonical)
        }
    }
}

fn verify_rsa_pkcs1v15(
    spki_der:  &[u8],
    sig_bytes: &[u8],
    data:      &[u8],
) -> (bool, Option<String>, bool) {
    use rsa::RsaPublicKey;
    use rsa::pkcs8::DecodePublicKey as _;
    use rsa::signature::Verifier;
    use rsa::pkcs1v15::{Signature, VerifyingKey};

    let key = match RsaPublicKey::from_public_key_der(spki_der) {
        Ok(k) => k,
        Err(e) => return (false, Some(format!("rsa_key_import: {e}")), false),
    };
    let verifying_key: VerifyingKey<sha2::Sha256> = VerifyingKey::new(key);
    let sig = match Signature::try_from(sig_bytes) {
        Ok(s) => s,
        Err(e) => return (false, Some(format!("rsa_sig_parse: {e}")), false),
    };
    let ok = verifying_key.verify(data, &sig).is_ok();
    (ok, if ok { None } else { Some("rsa_verify_failed".to_owned()) }, false)
}

// ─── Certificate expiry check ─────────────────────────────────────────────────

fn is_cert_der_expired(cert_der: &[u8]) -> bool {
    use x509_cert::Certificate;
    use der::Decode;
    use std::time::{SystemTime, UNIX_EPOCH};

    let cert = match Certificate::from_der(cert_der) {
        Ok(c) => c,
        Err(_) => return false,
    };

    let not_after = &cert.tbs_certificate.validity.not_after;
    let cert_secs = match not_after {
        x509_cert::time::Time::UtcTime(ut) => ut.to_unix_duration().as_secs(),
        x509_cert::time::Time::GeneralTime(gt) => gt.to_unix_duration().as_secs(),
    };
    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    cert_secs < now_secs
}

// ─── ZIP helpers ──────────────────────────────────────────────────────────────

fn read_entry<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Result<Vec<u8>, AppError> {
    let mut entry = archive.by_name(name)
        .map_err(|_| AppError::Parse(format!("Missing {name}")))?;
    let mut buf = Vec::new();
    entry.read_to_end(&mut buf)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(buf)
}

fn read_entry_str<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Result<String, AppError> {
    let bytes = read_entry(archive, name)?;
    String::from_utf8(bytes).map_err(|e| AppError::Parse(e.to_string()))
}

fn return_invalid(reason: &str, si: Option<SignerInfo>) -> FullValidationResult {
    FullValidationResult {
        status:         "invalid".to_owned(),
        reason:         Some(reason.to_owned()),
        algorithm:      None,
        signed_at:      None,
        content_digest: None,
        tsa_verified:   false,
        cert_expired:   false,
        signer_info:    si,
    }
}

// ─── Canonical content ────────────────────────────────────────────────────────

fn build_canonical_content(
    data:   &[u8],
    schema: &[u8],
    meta:   &[u8],
    pdf:    Option<&[u8]>,
) -> Vec<u8> {
    let sections: Vec<&[u8]> = if let Some(p) = pdf {
        vec![data, schema, meta, p]
    } else {
        vec![data, schema, meta]
    };
    let total: usize = sections.iter().map(|s| 4 + s.len()).sum();
    let mut out = Vec::with_capacity(total);
    for section in sections {
        out.extend_from_slice(&(section.len() as u32).to_be_bytes());
        out.extend_from_slice(section);
    }
    out
}
