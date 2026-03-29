// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Vite bundles `crypto` as empty in the browser; @etapsky/sdf-kit uses `randomUUID` only. */
export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}
