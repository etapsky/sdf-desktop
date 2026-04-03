// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Tauri validation bridge — Faz 3.
//!
//! Two validation paths:
//!   self_signed  — sdf-kit Web Crypto (stored public key from OS keychain)
//!   x509         — Rust native pipeline (embedded cert in signature.sig)
//!
//! `validateSdfSignature` is the single entry point — dispatches by mode.

import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { extractJSON } from "@etapsky/sdf-kit/reader";
import { importSDFPublicKey, verifySig } from "@etapsky/sdf-kit/signer";
import type { SDFSignerInfo } from "@etapsky/sdf-kit/signer";
import { readSdfFile } from "@/lib/tauri/fs";
import { getSigningAlgorithm, getSigningPublicKey } from "@/lib/tauri/keychain";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignatureStatus = "valid" | "invalid" | "unsigned";

export interface SignatureValidation {
  status:          SignatureStatus;
  reason?:         string | null;
  algorithm?:      string | null;
  signed_at?:      string | null;
  content_digest?: string | null;
  tsa_verified?:   boolean;
  cert_expired?:   boolean;
  signer_info?:    SDFSignerInfo | null;
}

// ─── Full validation (Rust pipeline) ─────────────────────────────────────────

const FullValidationSchema = z.object({
  status:          z.enum(["valid", "invalid", "unsigned"]),
  reason:          z.string().nullable().optional(),
  algorithm:       z.string().nullable().optional(),
  signed_at:       z.string().nullable().optional(),
  content_digest:  z.string().nullable().optional(),
  tsa_verified:    z.boolean(),
  cert_expired:    z.boolean(),
  signer_info:     z.unknown().optional(),
});

async function validateSdfFull(
  path:                   string,
  trusted_public_key_b64: string | null,
  algorithm:              string | null,
): Promise<SignatureValidation> {
  const raw = await invoke("validate_sdf_full", {
    args: { path, trusted_public_key_b64, algorithm },
  });
  const parsed = FullValidationSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "invalid", reason: "unexpected_rust_response" };
  }
  return {
    status:          parsed.data.status,
    reason:          parsed.data.reason ?? null,
    algorithm:       parsed.data.algorithm ?? null,
    signed_at:       parsed.data.signed_at ?? null,
    content_digest:  parsed.data.content_digest ?? null,
    tsa_verified:    parsed.data.tsa_verified,
    cert_expired:    parsed.data.cert_expired,
    signer_info:     (parsed.data.signer_info as SDFSignerInfo | null | undefined) ?? null,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/** Validate an SDF file's signature. Dispatches automatically by signing mode. */
export async function validateSdfSignature(path: string): Promise<SignatureValidation> {
  if (path.toLowerCase().endsWith(".pdf")) {
    return { status: "unsigned", reason: "plain_pdf" };
  }

  try {
    const bytes = await readSdfFile(path);
    const { meta } = await extractJSON(bytes);

    if (!meta.signature_algorithm) {
      return { status: "unsigned", reason: "signature_algorithm_null" };
    }

    // Detect signing mode from the embedded signature.sig
    const mode = await detectSigningMode(bytes);

    if (mode === "x509") {
      return validateSdfFull(path, null, meta.signature_algorithm ?? null);
    }

    // Self-signed path — Web Crypto via sdf-kit
    const algo = (await getSigningAlgorithm()) ?? "ECDSA";

    // Prefer the public key embedded in signature.sig (self-contained verification).
    // Fall back to the key stored in the OS keychain (TOFU — this device signed it).
    const embeddedKey  = await detectEmbeddedPublicKey(bytes);
    const keychainKey  = await getSigningPublicKey();
    const publicKeyB64 = embeddedKey ?? keychainKey;

    if (!publicKeyB64) {
      return { status: "invalid", reason: "missing_trust_key" };
    }

    const publicKey = await importSDFPublicKey(publicKeyB64, algo);
    const verified  = await verifySig(bytes, { publicKey, algorithm: algo });

    return {
      status:          verified.valid ? "valid" : "invalid",
      reason:          verified.reason ?? null,
      algorithm:       verified.algorithm,
      signed_at:       verified.signed_at,
      content_digest:  verified.content_digest,
      tsa_verified:    !!(verified.signer_info?.tsa_token_b64),
      cert_expired:    false,
      signer_info:     verified.signer_info ?? null,
    };
  } catch (e) {
    return {
      status: "invalid",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─── Embedded public key extraction ──────────────────────────────────────────

/** Extract `signer_info.public_key_spki_b64` from signature.sig, if present. */
async function detectEmbeddedPublicKey(bytes: Uint8Array): Promise<string | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip    = await JSZip.loadAsync(bytes);
    const sigRaw = await zip.file("signature.sig")?.async("string");
    if (!sigRaw) return null;
    const payload = JSON.parse(sigRaw) as {
      signer_info?: { public_key_spki_b64?: string };
    };
    return payload.signer_info?.public_key_spki_b64 ?? null;
  } catch {
    return null;
  }
}

// ─── Mode detection ────────────────────────────────────────────────────────────

async function detectSigningMode(bytes: Uint8Array): Promise<"self_signed" | "x509"> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip   = await JSZip.loadAsync(bytes);
    const sigRaw = await zip.file("signature.sig")?.async("string");
    if (!sigRaw) return "self_signed";
    const payload = JSON.parse(sigRaw) as { signer_info?: { mode?: string } };
    return payload.signer_info?.mode === "x509" ? "x509" : "self_signed";
  } catch {
    return "self_signed";
  }
}
