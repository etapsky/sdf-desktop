// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Cross-platform OS certificate store enumeration.
//!
//! macOS  — queries Keychain identity search (SecIdentity = cert + private key).
//! Windows — queries the "MY" CertStore (personal certificates).
//! Other  — returns an empty list.
//!
//! Only certificates that have an associated private key (i.e. the user can
//! actually sign with them) are returned.

use crate::error::AppError;
use super::CertInfo;

// ─── Public entry point ───────────────────────────────────────────────────────

pub fn list_signing_certificates() -> Result<Vec<CertInfo>, AppError> {
    platform_list()
}

// ─── Certificate DER helpers ──────────────────────────────────────────────────

/// Parse a DER certificate and extract metadata into `CertInfo`.
pub fn parse_cert_der(der: &[u8], fingerprint_sha256: String) -> Option<CertInfo> {
    use x509_cert::Certificate;
    use der::Decode;

    let cert = Certificate::from_der(der).ok()?;
    let tbs  = &cert.tbs_certificate;

    let subject_str = format!("{}", tbs.subject);
    let issuer_str  = format!("{}", tbs.issuer);

    let common_name  = extract_rdn(&subject_str, "CN");
    let organization = extract_rdn(&subject_str, "O");
    let email        = extract_rdn(&subject_str, "emailAddress")
        .or_else(|| extract_rdn(&subject_str, "E"));
    let country      = extract_rdn(&subject_str, "C");

    let not_before = time_to_rfc3339(&tbs.validity.not_before);
    let not_after  = time_to_rfc3339(&tbs.validity.not_after);
    let is_expired = is_cert_expired(&tbs.validity.not_after);

    let is_self_signed = subject_str == issuer_str;

    let key_algorithm = cert
        .tbs_certificate
        .subject_public_key_info
        .algorithm
        .oid
        .to_string();
    let key_algorithm = match key_algorithm.as_str() {
        "1.2.840.10045.2.1" => {
            // EC — determine curve from parameters
            let curve = cert
                .tbs_certificate
                .subject_public_key_info
                .algorithm
                .parameters
                .as_ref()
                .map(|p| hex::encode(p.value()))
                .unwrap_or_default();
            if curve.contains("8648ce3d030107") || curve.contains("prime256v1") {
                "ECDSA-P256"
            } else if curve.contains("secp384r1") {
                "ECDSA-P384"
            } else {
                "ECDSA"
            }.to_owned()
        }
        "1.2.840.113549.1.1.1" => "RSA".to_owned(),
        other => other.to_owned(),
    };

    Some(CertInfo {
        fingerprint_sha256,
        common_name,
        email,
        organization,
        country,
        issuer: issuer_str,
        not_before,
        not_after,
        is_expired,
        is_self_signed,
        key_algorithm,
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn extract_rdn(dn_string: &str, attr: &str) -> Option<String> {
    // RFC 2253 DN string: "CN=John Doe, O=Acme, C=US"
    // Handles both "CN=" and "CN =".
    let prefix = format!("{}=", attr);
    for part in dn_string.split(',') {
        let trimmed = part.trim();
        if trimmed.to_uppercase().starts_with(&prefix.to_uppercase()) {
            let value = trimmed[prefix.len()..].trim().trim_matches('"');
            if !value.is_empty() {
                return Some(value.to_owned());
            }
        }
    }
    None
}

fn time_to_rfc3339(t: &x509_cert::time::Time) -> String {
    use x509_cert::time::Time;
    let secs = match t {
        Time::UtcTime(ut) => ut.to_unix_duration().as_secs(),
        Time::GeneralTime(gt) => gt.to_unix_duration().as_secs(),
    };
    unix_to_rfc3339(secs as i64)
}

fn is_cert_expired(t: &x509_cert::time::Time) -> bool {
    use std::time::{SystemTime, UNIX_EPOCH};
    use x509_cert::time::Time;
    let cert_secs = match t {
        Time::UtcTime(ut) => ut.to_unix_duration().as_secs(),
        Time::GeneralTime(gt) => gt.to_unix_duration().as_secs(),
    };
    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    cert_secs < now_secs
}

pub fn unix_to_rfc3339(secs: i64) -> String {
    chrono::DateTime::from_timestamp(secs, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_owned())
}

pub fn sha256_hex(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(data))
}

// ─── macOS implementation ─────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn platform_list() -> Result<Vec<CertInfo>, AppError> {
    use security_framework::item::{ItemClass, ItemSearchOptions, SearchResult, Reference};

    let results = ItemSearchOptions::new()
        .class(ItemClass::identity())
        .load_refs(true)
        .limit(256)
        .search()
        .map_err(|e| AppError::Io(format!("Keychain search failed: {e}")))?;

    let mut certs = Vec::new();
    for result in results {
        if let SearchResult::Ref(Reference::Identity(identity)) = result {
            match identity.certificate() {
                Ok(cert) => {
                    let der: Vec<u8> = cert.to_der();
                    let fp = sha256_hex(&der);
                    if let Some(info) = parse_cert_der(&der, fp) {
                        certs.push(info);
                    }
                }
                Err(_) => continue,
            }
        }
    }

    // Sort: non-expired first, then by common_name
    certs.sort_by(|a, b| {
        a.is_expired.cmp(&b.is_expired)
            .then(a.common_name.cmp(&b.common_name))
    });

    Ok(certs)
}

/// Retrieve the macOS `SecIdentity` for a given fingerprint and sign `data`.
/// Returns DER-encoded ECDSA signature bytes (ASN.1 SEQUENCE{r,s}).
#[cfg(target_os = "macos")]
pub fn macos_sign_with_identity(
    fingerprint: &str,
    data: &[u8],
    algorithm: &str,
) -> Result<Vec<u8>, AppError> {
    use security_framework::item::{ItemClass, ItemSearchOptions, SearchResult, Reference};
    use security_framework::key::Algorithm;

    let results = ItemSearchOptions::new()
        .class(ItemClass::identity())
        .load_refs(true)
        .limit(256)
        .search()
        .map_err(|e| AppError::Io(format!("Keychain search failed: {e}")))?;

    for result in results {
        if let SearchResult::Ref(Reference::Identity(identity)) = result {
            let cert = identity.certificate()
                .map_err(|e: security_framework::base::Error| AppError::Io(e.to_string()))?;
            let der: Vec<u8> = cert.to_der();
            let fp = sha256_hex(&der);
            if fp != fingerprint { continue; }

            let key = identity.private_key()
                .map_err(|e: security_framework::base::Error| AppError::Io(e.to_string()))?;

            // Choose algorithm based on key type
            let sign_algo = if algorithm == "ECDSA" {
                Algorithm::ECDSASignatureMessageX962SHA256
            } else {
                Algorithm::RSASignatureMessagePKCS1v15SHA256
            };

            let sig = key.create_signature(sign_algo, data)
                .map_err(|e| AppError::Io(format!("Signing failed: {e}")))?;

            return Ok(sig.to_vec());
        }
    }

    Err(AppError::NotFound(format!("Certificate not found: {fingerprint}")))
}

/// Retrieve the DER bytes of the certificate with the given fingerprint.
#[cfg(target_os = "macos")]
pub fn macos_get_cert_der(fingerprint: &str) -> Result<Vec<u8>, AppError> {
    use security_framework::item::{ItemClass, ItemSearchOptions, SearchResult, Reference};

    let results = ItemSearchOptions::new()
        .class(ItemClass::identity())
        .load_refs(true)
        .limit(256)
        .search()
        .map_err(|e| AppError::Io(e.to_string()))?;

    for result in results {
        if let SearchResult::Ref(Reference::Identity(identity)) = result {
            if let Ok(cert) = identity.certificate() {
                let der: Vec<u8> = cert.to_der();
                if sha256_hex(&der) == fingerprint {
                    return Ok(der);
                }
            }
        }
    }
    Err(AppError::NotFound(format!("Certificate DER not found: {fingerprint}")))
}

// ─── Windows implementation ───────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn platform_list() -> Result<Vec<CertInfo>, AppError> {
    use windows::Win32::Security::Cryptography::*;
    use windows::core::PCSTR;
    use std::ffi::CString;

    let mut certs = Vec::new();

    unsafe {
        let store_name = CString::new("MY").unwrap();
        let store = CertOpenSystemStoreA(None, PCSTR(store_name.as_ptr() as _));
        if store.0 == 0 {
            return Err(AppError::Io("Failed to open Windows certificate store".into()));
        }

        let mut ctx = CertEnumCertificatesInStore(store, None);
        while !ctx.is_null() {
            let cert_ctx = &*ctx;
            let der_len = cert_ctx.cbCertEncoded as usize;
            let der_ptr = cert_ctx.pbCertEncoded;
            let der = std::slice::from_raw_parts(der_ptr, der_len).to_vec();
            let fp = sha256_hex(&der);

            // Only include certs that have a private key in the store
            let mut key_size: u32 = 0;
            let has_key = CertGetCertificateContextProperty(
                ctx,
                CERT_KEY_PROV_INFO_PROP_ID,
                None,
                &mut key_size,
            ).as_bool();

            if has_key {
                if let Some(info) = parse_cert_der(&der, fp) {
                    certs.push(info);
                }
            }

            ctx = CertEnumCertificatesInStore(store, ctx);
        }

        CertCloseStore(store, 0);
    }

    certs.sort_by(|a, b| {
        a.is_expired.cmp(&b.is_expired)
            .then(a.common_name.cmp(&b.common_name))
    });

    Ok(certs)
}

#[cfg(target_os = "windows")]
pub fn windows_sign_with_cert(
    fingerprint: &str,
    data: &[u8],
    _algorithm: &str,
) -> Result<Vec<u8>, AppError> {
    use windows::Win32::Security::Cryptography::*;
    use std::ffi::CString;
    use windows::core::PCSTR;

    unsafe {
        let store_name = CString::new("MY").unwrap();
        let store = CertOpenSystemStoreA(None, PCSTR(store_name.as_ptr() as _));
        if store.0 == 0 {
            return Err(AppError::Io("Failed to open certificate store".into()));
        }

        let mut ctx = CertEnumCertificatesInStore(store, None);
        while !ctx.is_null() {
            let cert_ctx = &*ctx;
            let der_len = cert_ctx.cbCertEncoded as usize;
            let der = std::slice::from_raw_parts(cert_ctx.pbCertEncoded, der_len);
            if sha256_hex(der) == fingerprint {
                // Sign using NCrypt
                let mut key_handle_ptr: NCRYPT_KEY_HANDLE = NCRYPT_KEY_HANDLE::default();
                let mut key_spec: u32 = 0;
                let mut must_free = windows::Win32::Foundation::BOOL(0);
                let ok = CryptAcquireCertificatePrivateKey(
                    ctx,
                    CRYPT_ACQUIRE_ONLY_NCRYPT_KEY_FLAG,
                    None,
                    &mut key_handle_ptr,
                    Some(&mut key_spec),
                    Some(&mut must_free),
                );
                if !ok.as_bool() {
                    CertCloseStore(store, 0);
                    return Err(AppError::Io("Failed to acquire private key".into()));
                }

                use sha2::{Digest, Sha256};
                let hash = Sha256::digest(data);

                let pad_info = BCRYPT_PKCS1_PADDING_INFO {
                    pszAlgId: windows::core::w!("SHA256"),
                };

                let mut sig_len: u32 = 0;
                NCryptSignHash(
                    key_handle_ptr,
                    Some(&pad_info as *const _ as *const _),
                    &hash,
                    None,
                    &mut sig_len,
                    NCRYPT_FLAGS(0),
                ).ok().map_err(|e| AppError::Io(e.to_string()))?;

                let mut sig = vec![0u8; sig_len as usize];
                NCryptSignHash(
                    key_handle_ptr,
                    Some(&pad_info as *const _ as *const _),
                    &hash,
                    Some(&mut sig),
                    &mut sig_len,
                    NCRYPT_FLAGS(0),
                ).ok().map_err(|e| AppError::Io(e.to_string()))?;

                if must_free.as_bool() {
                    NCryptFreeObject(NCRYPT_HANDLE(key_handle_ptr.0)).ok();
                }
                CertCloseStore(store, 0);
                sig.truncate(sig_len as usize);
                return Ok(sig);
            }
            ctx = CertEnumCertificatesInStore(store, ctx);
        }

        CertCloseStore(store, 0);
    }
    Err(AppError::NotFound(format!("Certificate not found: {fingerprint}")))
}

#[cfg(target_os = "windows")]
pub fn windows_get_cert_der(fingerprint: &str) -> Result<Vec<u8>, AppError> {
    use windows::Win32::Security::Cryptography::*;
    use std::ffi::CString;
    use windows::core::PCSTR;

    unsafe {
        let store_name = CString::new("MY").unwrap();
        let store = CertOpenSystemStoreA(None, PCSTR(store_name.as_ptr() as _));
        if store.0 == 0 {
            return Err(AppError::Io("Failed to open certificate store".into()));
        }
        let mut ctx = CertEnumCertificatesInStore(store, None);
        while !ctx.is_null() {
            let cert_ctx = &*ctx;
            let der = std::slice::from_raw_parts(cert_ctx.pbCertEncoded, cert_ctx.cbCertEncoded as usize).to_vec();
            if sha256_hex(&der) == fingerprint {
                CertCloseStore(store, 0);
                return Ok(der);
            }
            ctx = CertEnumCertificatesInStore(store, ctx);
        }
        CertCloseStore(store, 0);
    }
    Err(AppError::NotFound(format!("Certificate DER not found: {fingerprint}")))
}

// ─── Fallback (Linux / other) ─────────────────────────────────────────────────

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn platform_list() -> Result<Vec<CertInfo>, AppError> {
    Ok(Vec::new())
}
