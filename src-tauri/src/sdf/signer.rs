// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Native SDF signing pipeline — X.509 certificate path.
//!
//! Signs an SDF archive on disk using an OS-stored certificate identified by
//! its SHA-256 fingerprint. The private key never leaves the OS secure storage
//! (Secure Enclave on macOS, NCrypt on Windows).
//!
//! Flow:
//!   1. Open SDF ZIP, extract data.json / schema.json / meta.json (/ visual.pdf)
//!   2. Build canonical content (same 4-byte length-prefix scheme as sdf-kit)
//!   3. SHA-256 digest of canonical content
//!   4. OS-native sign (macOS SecKey or Windows NCrypt) → DER ECDSA signature
//!   5. (optional) RFC 3161 TSA request → embed token + genTime
//!   6. Write updated signature.sig + meta.json back into the ZIP
//!   7. Write resulting bytes to the original path

use crate::error::AppError;
use super::{SignerInfo, SigPayload};
use super::certstore;

use std::io::{Read, Write, Seek};
use zip::ZipArchive;
use zip::write::SimpleFileOptions;
use base64ct::{Base64, Encoding};
use sha2::{Digest, Sha256};

// ─── Public API ───────────────────────────────────────────────────────────────

pub struct SignOptions<'a> {
    pub path:            &'a str,
    pub fingerprint:     &'a str,
    /// "ECDSA" or "RSASSA-PKCS1-v1_5"
    pub algorithm:       &'a str,
    pub include_pdf:     bool,
    pub include_tsa:     bool,
    pub tsa_url:         Option<String>,
}

pub struct SignResult {
    pub signed_at:      String,
    pub content_digest: String,
    pub signer_info:    SignerInfo,
}

/// Sign an SDF file on disk using an OS certificate. Mutates the file in place.
pub async fn sign_sdf_with_certificate(opts: SignOptions<'_>) -> Result<SignResult, AppError> {
    let original = std::fs::read(opts.path)
        .map_err(|e| AppError::Io(format!("Cannot read {}: {e}", opts.path)))?;

    let signed = sign_bytes(
        &original,
        opts.fingerprint,
        opts.algorithm,
        opts.include_pdf,
        opts.include_tsa,
        opts.tsa_url.as_deref(),
    ).await?;

    std::fs::write(opts.path, &signed.0)
        .map_err(|e| AppError::Io(format!("Cannot write {}: {e}", opts.path)))?;

    Ok(signed.1)
}

// ─── Core signing function ────────────────────────────────────────────────────

async fn sign_bytes(
    buf: &[u8],
    fingerprint: &str,
    algorithm: &str,
    include_pdf: bool,
    include_tsa: bool,
    tsa_url: Option<&str>,
) -> Result<(Vec<u8>, SignResult), AppError> {
    // 1. Open ZIP
    let cursor = std::io::Cursor::new(buf);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| AppError::Parse(format!("Invalid ZIP: {e}")))?;

    let data_raw   = read_entry(&mut archive, "data.json")?;
    let schema_raw = read_entry(&mut archive, "schema.json")?;
    let meta_raw   = read_entry_str(&mut archive, "meta.json")?;
    let pdf_raw: Option<Vec<u8>> = if include_pdf {
        Some(read_entry(&mut archive, "visual.pdf")?)
    } else {
        None
    };

    // 2. Build canonical content (must be byte-for-byte identical to sdf-kit)
    let canonical = build_canonical_content(
        &data_raw,
        &schema_raw,
        meta_raw.as_bytes(),
        pdf_raw.as_deref(),
    );

    // 3. Digest
    let digest_bytes = Sha256::digest(&canonical);
    let content_digest = hex::encode(&digest_bytes);

    // 4. OS-native sign → DER ECDSA bytes
    let sig_bytes = os_sign(fingerprint, algorithm, &canonical)?;
    let signature = Base64::encode_string(&sig_bytes);
    let signed_at = chrono::Utc::now().to_rfc3339();

    // 5. Retrieve cert DER for embedding
    let cert_der = os_get_cert_der(fingerprint)?;
    let cert_b64 = Base64::encode_string(&cert_der);

    // Parse cert metadata for signer_info display
    let cert_info = certstore::parse_cert_der(&cert_der, fingerprint.to_owned());

    // 6. Optional TSA
    let (tsa_token_b64, tsa_signed_at) = if include_tsa {
        // tsa_url override is forwarded via TSA_URL env var if provided
        if let Some(url) = tsa_url {
            std::env::set_var("TSA_URL", url);
        }
        // TSA signs the content_digest (SHA-256 of canonical content)
        match super::tsa::request_timestamp(&content_digest).await {
            Ok((token, ts_at)) => (Some(token), Some(ts_at)),
            Err(e) => {
                eprintln!("[sdf::signer] TSA request failed (non-fatal): {e}");
                (None, None)
            }
        }
    } else {
        (None, None)
    };

    let signer_info = SignerInfo {
        mode: "x509".to_owned(),
        common_name:              cert_info.as_ref().and_then(|c| c.common_name.clone()),
        email:                    cert_info.as_ref().and_then(|c| c.email.clone()),
        organization:             cert_info.as_ref().and_then(|c| c.organization.clone()),
        issuer_name:              cert_info.as_ref().map(|c| c.issuer.clone()),
        certificate_der_b64:      Some(cert_b64),
        cert_fingerprint_sha256:  Some(fingerprint.to_owned()),
        not_before:               cert_info.as_ref().map(|c| c.not_before.clone()),
        not_after:                cert_info.as_ref().map(|c| c.not_after.clone()),
        tsa_token_b64,
        tsa_signed_at,
        signature_encoding:       Some("der".to_owned()),
        public_key_spki_b64:      None, // x509 path — public key is in the embedded cert
    };

    // 7. Build updated signature.sig
    let payload = SigPayload {
        algorithm:       algorithm.to_owned(),
        signed_at:       signed_at.clone(),
        content_digest:  content_digest.clone(),
        include_pdf,
        signature,
        meta_snapshot:   Some(meta_raw.clone()),
        signer_info:     Some(signer_info.clone()),
    };
    let sig_json = serde_json::to_string_pretty(&payload)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // 8. Update meta.json with signature_algorithm
    let mut meta: serde_json::Value = serde_json::from_str(&meta_raw)
        .map_err(|e| AppError::Parse(e.to_string()))?;
    meta["signature_algorithm"] = serde_json::Value::String(algorithm.to_owned());
    meta["signed_at"]           = serde_json::Value::String(signed_at.clone());
    let meta_updated = serde_json::to_string_pretty(&meta)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // 9. Repack the ZIP
    let out_bytes = repack_zip(buf, &sig_json, &meta_updated)?;

    Ok((out_bytes, SignResult { signed_at, content_digest, signer_info }))
}

// ─── ZIP helpers ──────────────────────────────────────────────────────────────

fn read_entry<R: Read + Seek>(archive: &mut ZipArchive<R>, name: &str) -> Result<Vec<u8>, AppError> {
    let mut entry = archive.by_name(name)
        .map_err(|_| AppError::Parse(format!("Missing {name} in SDF archive")))?;
    let mut buf = Vec::new();
    entry.read_to_end(&mut buf)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(buf)
}

fn read_entry_str<R: Read + Seek>(archive: &mut ZipArchive<R>, name: &str) -> Result<String, AppError> {
    let bytes = read_entry(archive, name)?;
    String::from_utf8(bytes).map_err(|e| AppError::Parse(e.to_string()))
}

/// Repack the ZIP: copy all existing entries, then overwrite / add signature.sig and meta.json.
fn repack_zip(original: &[u8], sig_json: &str, meta_json: &str) -> Result<Vec<u8>, AppError> {
    let reader = std::io::Cursor::new(original);
    let mut source = ZipArchive::new(reader)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let out_buf = Vec::new();
    let out_cursor = std::io::Cursor::new(out_buf);
    let mut writer = zip::ZipWriter::new(out_cursor);

    let opts = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    // Copy all entries except the ones we're replacing
    for i in 0..source.len() {
        let mut entry = source.by_index(i)
            .map_err(|e| AppError::Parse(e.to_string()))?;
        let name = entry.name().to_owned();
        if name == "signature.sig" || name == "meta.json" { continue; }
        writer.start_file(&name, opts)
            .map_err(|e| AppError::Io(e.to_string()))?;
        std::io::copy(&mut entry, &mut writer)
            .map_err(|e| AppError::Io(e.to_string()))?;
    }

    // Write updated meta.json
    writer.start_file("meta.json", opts)
        .map_err(|e| AppError::Io(e.to_string()))?;
    writer.write_all(meta_json.as_bytes())
        .map_err(|e| AppError::Io(e.to_string()))?;

    // Write signature.sig
    writer.start_file("signature.sig", opts)
        .map_err(|e| AppError::Io(e.to_string()))?;
    writer.write_all(sig_json.as_bytes())
        .map_err(|e| AppError::Io(e.to_string()))?;

    let out = writer.finish()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(out.into_inner())
}

// ─── Canonical content (matches sdf-kit byte-for-byte) ────────────────────────

fn build_canonical_content(
    data: &[u8],
    schema: &[u8],
    meta: &[u8],
    pdf: Option<&[u8]>,
) -> Vec<u8> {
    let sections: Vec<&[u8]> = if let Some(p) = pdf {
        vec![data, schema, meta, p]
    } else {
        vec![data, schema, meta]
    };
    let total: usize = sections.iter().map(|s| 4 + s.len()).sum();
    let mut out = Vec::with_capacity(total);
    for section in sections {
        let len = section.len() as u32;
        out.extend_from_slice(&len.to_be_bytes());
        out.extend_from_slice(section);
    }
    out
}

// ─── OS-native signing dispatch ───────────────────────────────────────────────

fn os_sign(fingerprint: &str, algorithm: &str, data: &[u8]) -> Result<Vec<u8>, AppError> {
    #[cfg(target_os = "macos")]
    return certstore::macos_sign_with_identity(fingerprint, data, algorithm);

    #[cfg(target_os = "windows")]
    return certstore::windows_sign_with_cert(fingerprint, data, algorithm);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (fingerprint, algorithm, data);
        Err(AppError::Parse("OS certificate signing not supported on this platform".into()))
    }
}

fn os_get_cert_der(fingerprint: &str) -> Result<Vec<u8>, AppError> {
    #[cfg(target_os = "macos")]
    return certstore::macos_get_cert_der(fingerprint);

    #[cfg(target_os = "windows")]
    return certstore::windows_get_cert_der(fingerprint);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = fingerprint;
        Err(AppError::Parse("OS certificate store not supported on this platform".into()))
    }
}
