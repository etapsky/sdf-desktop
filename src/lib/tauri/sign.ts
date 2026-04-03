// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//! Tauri signing bridge — Faz 3.
//!
//! Two signing paths:
//!
//!   self_signed  — generate/reuse ECDSA key pair in OS keychain, sign via Web Crypto
//!                  (sdf-kit). No OS certificate needed — good for personal use.
//!
//!   x509         — sign using an OS-stored X.509 certificate (macOS Keychain identity,
//!                  Windows CertStore). Private key never leaves the OS secure storage.
//!                  Invokes the Rust `sign_sdf_with_certificate_cmd` command.

import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import JSZip from "jszip";
import {
  exportSDFPrivateKey,
  exportSDFPublicKey,
  generateSDFKeyPair,
  importSDFPublicKey,
  importSDFPrivateKey,
  signSDF,
  type SDFSigningAlgorithm,
  type SDFSignerInfo,
} from "@etapsky/sdf-kit/signer";
import { readSdfFile } from "@/lib/tauri/fs";
import {
  getSigningAlgorithm,
  getSigningPublicKey,
  loadSigningKeys,
  saveSigningKeys,
} from "@/lib/tauri/keychain";

// ─── Types ────────────────────────────────────────────────────────────────────

/** OS certificate available for signing (from Rust certstore). */
export interface CertInfo {
  fingerprint_sha256: string;
  common_name:        string | null;
  email:              string | null;
  organization:       string | null;
  country:            string | null;
  issuer:             string;
  not_before:         string;
  not_after:          string;
  is_expired:         boolean;
  is_self_signed:     boolean;
  key_algorithm:      string;
}

export type SignSdfStatus = "signed" | "not_implemented" | "unsupported";

export interface SignSdfResult {
  status:         SignSdfStatus;
  message:        string;
  signer_info?:   SDFSignerInfo;
}

// ─── Certificate enumeration ──────────────────────────────────────────────────

/** List all signing certificates available in the OS cert store. */
export async function listSigningCertificates(): Promise<CertInfo[]> {
  return invoke<CertInfo[]>("list_signing_certificates_cmd");
}

// ─── X.509 signing path ───────────────────────────────────────────────────────

export interface SignWithCertOptions {
  path:        string;
  fingerprint: string;
  algorithm?:  "ECDSA" | "RSASSA-PKCS1-v1_5";
  includePDF?: boolean;
  includeTsa?: boolean;
  tsaUrl?:     string;
}

const SignWithCertResultSchema = z.object({
  status:         z.enum(["signed", "unsupported"]),
  signed_at:      z.string().nullable().optional(),
  content_digest: z.string().nullable().optional(),
  signer_info:    z.unknown().optional(),
});

/** Sign using an OS X.509 certificate. Mutates the file in place. */
export async function signSdfWithCertificate(opts: SignWithCertOptions): Promise<SignSdfResult> {
  const raw = await invoke("sign_sdf_with_certificate_cmd", {
    args: {
      path:        opts.path,
      fingerprint: opts.fingerprint,
      algorithm:   opts.algorithm ?? "ECDSA",
      include_pdf: opts.includePDF ?? true,
      include_tsa: opts.includeTsa ?? false,
      tsa_url:     opts.tsaUrl ?? null,
    },
  });

  const parsed = SignWithCertResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Unexpected response from sign_sdf_with_certificate_cmd: ${parsed.error.message}`);
  }

  return {
    status:       parsed.data.status as SignSdfStatus,
    message:      parsed.data.status === "signed" ? "ok" : "unsupported",
    signer_info:  parsed.data.signer_info as SDFSignerInfo | undefined,
  };
}

// ─── Self-signed path ─────────────────────────────────────────────────────────

async function normalizeSignedMeta(signedBuffer: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(signedBuffer);
  const metaRaw = await zip.file("meta.json")?.async("string");
  if (!metaRaw) return signedBuffer;
  try {
    const meta = JSON.parse(metaRaw) as Record<string, unknown>;
    if ("signed_at" in meta) {
      delete meta.signed_at;
      zip.file("meta.json", JSON.stringify(meta, null, 2));
      return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    }
  } catch {
    return signedBuffer;
  }
  return signedBuffer;
}

async function ensureSigningKeyPair() {
  const stored = await loadSigningKeys();
  const algorithm = (stored?.algorithm as "ECDSA" | "RSASSA-PKCS1-v1_5" | null) ?? "ECDSA";

  if (stored?.private_key_b64 && stored?.public_key_b64) {
    if (!(await isStoredKeyPairConsistent(stored.private_key_b64, stored.public_key_b64, algorithm))) {
      return generateAndPersistSigningKeyPair(algorithm);
    }
    return { algorithm, privateKeyB64: stored.private_key_b64, publicKeyB64: stored.public_key_b64 };
  }
  return generateAndPersistSigningKeyPair(algorithm);
}

async function generateAndPersistSigningKeyPair(algorithm: "ECDSA" | "RSASSA-PKCS1-v1_5") {
  const pair         = await generateSDFKeyPair(algorithm);
  const exportedPriv = await exportSDFPrivateKey(pair.privateKey);
  const exportedPub  = await exportSDFPublicKey(pair.publicKey);
  await saveSigningKeys(exportedPriv, exportedPub, algorithm);
  return { algorithm, privateKeyB64: exportedPriv, publicKeyB64: exportedPub };
}

async function isStoredKeyPairConsistent(
  privateKeyB64: string,
  publicKeyB64:  string,
  algorithm:     "ECDSA" | "RSASSA-PKCS1-v1_5",
): Promise<boolean> {
  try {
    const privateKey = await importSDFPrivateKey(privateKeyB64, algorithm as SDFSigningAlgorithm);
    const publicKey  = await importSDFPublicKey(publicKeyB64, algorithm as SDFSigningAlgorithm);
    const payload    = new TextEncoder().encode("etapsky-signing-self-check");
    const signAlgo   = algorithm === "ECDSA"
      ? { name: "ECDSA", hash: "SHA-256" as const }
      : { name: "RSASSA-PKCS1-v1_5" as const };
    const signature = await crypto.subtle.sign(signAlgo, privateKey, payload);
    return crypto.subtle.verify(signAlgo, publicKey, signature, payload);
  } catch {
    return false;
  }
}

/**
 * Self-signed SDF signing — keychain-backed key pair + Web Crypto.
 * Does not require an OS certificate.
 */
export async function signSdfDocument(absolutePath: string): Promise<SignSdfResult> {
  if (!absolutePath.toLowerCase().endsWith(".sdf")) {
    return { status: "unsupported", message: "only_sdf_files_can_be_signed" };
  }

  const bytes = await readSdfFile(absolutePath);
  const { algorithm, privateKeyB64, publicKeyB64 } = await ensureSigningKeyPair();
  const privateKey = await importSDFPrivateKey(privateKeyB64, algorithm as SDFSigningAlgorithm);

  // Embed the public key in signature.sig so the file is self-verifiable
  // without requiring file-system key store access during validation.
  const signerInfo: Partial<SDFSignerInfo> = {
    mode:                "self_signed",
    signature_encoding:  "p1363",
    public_key_spki_b64: publicKeyB64 ?? undefined,
  };

  const signed = await signSDF(bytes, {
    privateKey,
    algorithm: algorithm as SDFSigningAlgorithm,
    includePDF: true,
    signerInfo,
  });

  const normalized = await normalizeSignedMeta(signed.buffer);
  await invoke("write_sdf_file", {
    path: absolutePath,
    data: Array.from(normalized),
  });

  return {
    status:      "signed",
    message:     "ok",
    signer_info: signed.result.signer_info as SDFSignerInfo | undefined,
  };
}
