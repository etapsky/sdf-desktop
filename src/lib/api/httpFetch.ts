// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/**
 * In the Tauri WebView, `globalThis.fetch` is subject to browser CORS.
 * `@tauri-apps/plugin-http` runs the request in the native layer and bypasses CORS.
 * In plain browser dev (no Tauri), fall back to `fetch`.
 */
function isTauriWebView(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function httpFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isTauriWebView()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(input, init);
  }
  return globalThis.fetch(input, init);
}
