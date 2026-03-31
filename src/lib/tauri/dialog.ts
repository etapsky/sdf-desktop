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

function isTauriWebView(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Save `.sdf` bytes via native save dialog, or trigger a browser download when not in Tauri.
 * Returns saved file path in Tauri; null when canceled/unsupported.
 */
export async function saveSdfArrayBuffer(
  data: ArrayBuffer,
  defaultFilename: string
): Promise<string | null> {
  if (isTauriWebView()) {
    const path = await saveSdfAs(defaultFilename);
    if (!path) return null;
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, new Uint8Array(data));
    return path;
  }
  const blob = new Blob([data], { type: "application/vnd.sdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = defaultFilename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return null;
}

