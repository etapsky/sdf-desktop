// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { check, type Update } from "@tauri-apps/plugin-updater";

const CHECK_TIMEOUT_MS = 60_000;

/** Signed, HTTPS-only update metadata from configured endpoints. */
export async function fetchAvailableUpdate(): Promise<Update | null> {
  return check({
    timeout: CHECK_TIMEOUT_MS,
    headers: {
      "User-Agent": "Etapsky-Desktop/updater",
    },
  });
}
