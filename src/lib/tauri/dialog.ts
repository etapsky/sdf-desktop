// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { open, save } from "@tauri-apps/plugin-dialog";

/**
 * Centralized wrapper for Tauri open/save dialogs.
 *
 * For now we keep the same semantics as existing call sites:
 * - user cancel => returns `null`
 * - not in tauri (web/dev) => returns `null` (callers already treat it as cancel)
 */

export async function openSdfOrPdf(): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "SDF / PDF", extensions: ["sdf", "pdf"] }],
    });
    return typeof selected === "string" && selected ? selected : null;
  } catch {
    return null;
  }
}

export async function savePdfAs(defaultName: string): Promise<string | null> {
  try {
    return await save({
      defaultPath: defaultName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
  } catch {
    return null;
  }
}

export async function saveSdfAs(defaultName: string): Promise<string | null> {
  try {
    return await save({
      defaultPath: defaultName,
      filters: [{ name: "SDF", extensions: ["sdf"] }],
    });
  } catch {
    return null;
  }
}

