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
