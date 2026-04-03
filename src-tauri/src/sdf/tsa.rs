// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! RFC 3161 Time-Stamp Authority (TSA) client.
//!
//! Builds a minimal `TimeStampReq` DER and POSTs it to the TSA endpoint.
//! The raw `TimeStampResp` is stored as base64 in `signer_info.tsa_token_b64`.
//! The `genTime` is extracted with a lightweight DER scanner and returned as
//! `signer_info.tsa_signed_at` (ISO 8601).
//!
//! Default TSA: Sectigo (http://timestamp.sectigo.com) — free, RFC 3161, SHA-256.
//! Enterprise deployments may override via the `TSA_URL` environment variable.

pub const DEFAULT_TSA_URL: &str = "http://timestamp.sectigo.com";

/// Request a timestamp token for the given data SHA-256 digest.
/// Returns `(tsa_token_b64, tsa_signed_at)` on success.
pub async fn request_timestamp(
    content_digest_hex: &str,
) -> Result<(String, String), String> {
    let digest_bytes = hex::decode(content_digest_hex)
        .map_err(|e| format!("Invalid digest hex: {e}"))?;
    if digest_bytes.len() != 32 {
        return Err("Expected SHA-256 (32 bytes)".into());
    }
    let digest: [u8; 32] = digest_bytes.try_into().unwrap();

    let ts_req = build_ts_request(&digest);

    let tsa_url = std::env::var("TSA_URL")
        .unwrap_or_else(|_| DEFAULT_TSA_URL.to_owned());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post(&tsa_url)
        .header("Content-Type", "application/timestamp-query")
        .body(ts_req)
        .send()
        .await
        .map_err(|e| format!("TSA request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("TSA returned HTTP {}", response.status()));
    }

    let body = response.bytes().await.map_err(|e| e.to_string())?;
    let resp_bytes = body.to_vec();

    // Basic sanity: must start with 0x30 (DER SEQUENCE)
    if resp_bytes.first() != Some(&0x30) {
        return Err("TSA response is not DER".into());
    }

    // Parse PKIStatus: first inner integer must be 0 or 1 (granted / grantedWithMods)
    let status = parse_pki_status(&resp_bytes);
    if status != 0 && status != 1 {
        return Err(format!("TSA rejected request: PKIStatus={status}"));
    }

    // Extract genTime from the response DER (GeneralizedTime tag = 0x18)
    let gen_time = extract_gen_time(&resp_bytes)
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    use base64ct::{Base64, Encoding};
    let token_b64 = Base64::encode_string(&resp_bytes);

    Ok((token_b64, gen_time))
}

// ─── TimeStampReq DER builder ─────────────────────────────────────────────────
// Builds a minimal RFC 3161 TimeStampReq for SHA-256.
//
// TimeStampReq ::= SEQUENCE {
//     version          INTEGER { v1(1) },
//     messageImprint   MessageImprint,
//     nonce            INTEGER  OPTIONAL,
//     certReq          BOOLEAN  DEFAULT FALSE,
// }
// MessageImprint ::= SEQUENCE {
//     hashAlgorithm    AlgorithmIdentifier,
//     hashedMessage    OCTET STRING
// }

fn build_ts_request(digest: &[u8; 32]) -> Vec<u8> {
    // SHA-256 AlgorithmIdentifier: SEQUENCE { OID 2.16.840.1.101.3.4.2.1, NULL }
    let sha256_alg: &[u8] = &[
        0x30, 0x0d, // SEQUENCE (13 bytes)
        0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, // OID
        0x05, 0x00, // NULL
    ];

    // OCTET STRING wrapping the 32-byte digest
    let mut hash_os = vec![0x04u8, 0x20]; // OCTET STRING, 32 bytes
    hash_os.extend_from_slice(digest);

    // MessageImprint = SEQUENCE { sha256_alg (15 bytes), hash_os (34 bytes) } = 49 bytes inner
    let mut msg_imprint = vec![0x30u8, 0x31]; // SEQUENCE, 49 bytes
    msg_imprint.extend_from_slice(sha256_alg);
    msg_imprint.extend_from_slice(&hash_os);

    // version INTEGER v1 = 1
    let version: &[u8] = &[0x02, 0x01, 0x01];

    // nonce: 64-bit random integer
    let nonce_val: u64 = rand::random();
    let nonce_bytes = nonce_val.to_be_bytes();
    // Strip leading zeros for minimal DER encoding, but keep at least 1 byte
    let nonce_start = nonce_bytes.iter().position(|&b| b != 0).unwrap_or(7);
    let nonce_content = &nonce_bytes[nonce_start..];
    let mut nonce_int = vec![0x02u8, nonce_content.len() as u8];
    nonce_int.extend_from_slice(nonce_content);

    // certReq BOOLEAN TRUE (request cert in response for display)
    let cert_req: &[u8] = &[0x01, 0x01, 0xff];

    // Inner bytes
    let inner_len = version.len() + msg_imprint.len() + nonce_int.len() + cert_req.len();
    let mut ts_req = der_length_prefix(0x30, inner_len);
    ts_req.extend_from_slice(version);
    ts_req.extend_from_slice(&msg_imprint);
    ts_req.extend_from_slice(&nonce_int);
    ts_req.extend_from_slice(cert_req);
    ts_req
}

// ─── DER response parsers ─────────────────────────────────────────────────────

/// Extract the first INTEGER value after the first inner SEQUENCE (PKIStatus).
fn parse_pki_status(der: &[u8]) -> i32 {
    // TimeStampResp = SEQUENCE { PKIStatusInfo SEQUENCE { status INTEGER, … }, … }
    // Navigate: outer SEQUENCE → first content byte → inner SEQUENCE → content → INTEGER
    let inner = der_sequence_content(der).unwrap_or(der);
    let pki   = der_sequence_content(inner).unwrap_or(inner);
    if pki.len() >= 3 && pki[0] == 0x02 {
        let len = pki[1] as usize;
        if len > 0 && 2 + len <= pki.len() {
            let mut val: i32 = 0;
            for &b in &pki[2..2 + len] {
                val = (val << 8) | b as i32;
            }
            return val;
        }
    }
    -1
}

/// Scan for the first GeneralizedTime (tag 0x18) and parse it as RFC 3339.
fn extract_gen_time(der: &[u8]) -> Option<String> {
    let mut i = 0;
    while i + 2 < der.len() {
        if der[i] == 0x18 {
            let len = der[i + 1] as usize;
            if i + 2 + len <= der.len() {
                if let Ok(s) = std::str::from_utf8(&der[i + 2..i + 2 + len]) {
                    if s.len() >= 14 && s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
                        return parse_generalized_time(s);
                    }
                }
            }
        }
        i += 1;
    }
    None
}

/// Parse DER GeneralizedTime "YYYYMMDDHHmmss[.fff]Z" → RFC 3339.
fn parse_generalized_time(s: &str) -> Option<String> {
    let s = s.trim_end_matches('Z').split('.').next()?;
    if s.len() < 14 { return None; }
    let year   = &s[0..4];
    let month  = &s[4..6];
    let day    = &s[6..8];
    let hour   = &s[8..10];
    let minute = &s[10..12];
    let second = &s[12..14];
    Some(format!("{year}-{month}-{day}T{hour}:{minute}:{second}Z"))
}

// ─── Minimal DER utilities ─────────────────────────────────────────────────────

/// Return a TLV header (tag + length) for `tag` with `content_len` bytes.
fn der_length_prefix(tag: u8, content_len: usize) -> Vec<u8> {
    let mut out = vec![tag];
    if content_len < 0x80 {
        out.push(content_len as u8);
    } else if content_len < 0x100 {
        out.extend_from_slice(&[0x81, content_len as u8]);
    } else {
        out.extend_from_slice(&[0x82, (content_len >> 8) as u8, content_len as u8]);
    }
    out
}

/// Return the content bytes of the first DER SEQUENCE in `der` (skips tag+length).
fn der_sequence_content(der: &[u8]) -> Option<&[u8]> {
    if der.is_empty() || der[0] != 0x30 { return None; }
    let (content_start, content_len) = der_read_length(der, 1)?;
    let end = content_start + content_len;
    if end > der.len() { return None; }
    Some(&der[content_start..end])
}

fn der_read_length(der: &[u8], offset: usize) -> Option<(usize, usize)> {
    let first = *der.get(offset)?;
    if first < 0x80 {
        Some((offset + 1, first as usize))
    } else {
        let num_bytes = (first & 0x7f) as usize;
        if offset + 1 + num_bytes > der.len() { return None; }
        let mut len: usize = 0;
        for &b in &der[offset + 1..offset + 1 + num_bytes] {
            len = (len << 8) | b as usize;
        }
        Some((offset + 1 + num_bytes, len))
    }
}
