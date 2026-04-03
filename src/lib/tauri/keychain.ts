// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { invoke } from "@tauri-apps/api/core";

export async function setRefreshToken(token: string): Promise<void> {
  await invoke("keychain_set_refresh_token", { token });
}

export async function getRefreshToken(): Promise<string | null> {
  return invoke<string | null>("keychain_get_refresh_token");
}

export async function deleteRefreshToken(): Promise<void> {
  await invoke("keychain_delete_refresh_token");
}

export async function setSigningPrivateKey(value: string): Promise<void> {
  await invoke("keychain_set_signing_private_key", { value });
}

export async function getSigningPrivateKey(): Promise<string | null> {
  return invoke<string | null>("keychain_get_signing_private_key");
}

export async function setSigningPublicKey(value: string): Promise<void> {
  await invoke("keychain_set_signing_public_key", { value });
}

export async function getSigningPublicKey(): Promise<string | null> {
  return invoke<string | null>("keychain_get_signing_public_key");
}

export async function setSigningAlgorithm(value: "ECDSA" | "RSASSA-PKCS1-v1_5"): Promise<void> {
  await invoke("keychain_set_signing_algorithm", { value });
}

export async function getSigningAlgorithm(): Promise<"ECDSA" | "RSASSA-PKCS1-v1_5" | null> {
  const raw = await invoke<string | null>("keychain_get_signing_algorithm");
  if (raw === "ECDSA" || raw === "RSASSA-PKCS1-v1_5") return raw;
  return null;
}

// ─── File-based signing key store (replaces keychain for ECDSA keypair) ───────

export interface SigningKeyStore {
  private_key_b64: string;
  public_key_b64:  string;
  algorithm:       string;
}

export async function saveSigningKeys(
  privateKeyB64: string,
  publicKeyB64:  string,
  algorithm:     string,
): Promise<void> {
  await invoke("signing_keys_save", {
    privateKeyB64,
    publicKeyB64,
    algorithm,
  });
}

export async function loadSigningKeys(): Promise<SigningKeyStore | null> {
  return invoke<SigningKeyStore | null>("signing_keys_load");
}

// ─── Tauri error → readable string ───────────────────────────────────────────

/** Extract a human-readable message from a Tauri invoke error.
 *  AppError serializes as { "Io": "msg" } | { "Parse": "msg" } | { "NotFound": "msg" }
 *  or sometimes as a plain string. */
export function tauriErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    // Tauri AppError enum variants
    for (const key of ["Io", "Parse", "NotFound", "message", "error"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    return JSON.stringify(err);
  }
  return String(err);
}
