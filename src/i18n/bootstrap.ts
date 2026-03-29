// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

export type AppLocale = "en-US" | "fr-FR" | "de-DE";

const VALID: AppLocale[] = ["en-US", "fr-FR", "de-DE"];

/** Reads locale from zustand-persist storage (`sdf-locale`). */
export function readPersistedLocale(): AppLocale {
  try {
    const raw = localStorage.getItem("sdf-locale");
    if (!raw) return "en-US";
    const parsed = JSON.parse(raw) as { state?: { locale?: string } };
    const l = parsed.state?.locale;
    if (VALID.includes(l as AppLocale)) return l as AppLocale;
  } catch {
    /* ignore */
  }
  return "en-US";
}
