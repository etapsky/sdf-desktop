// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { AppLocale } from "./bootstrap";

/** i18n key under `locale.*` (JSON uses underscores). */
export function localeToTranslationKey(locale: AppLocale): string {
  return `locale.${locale.replace(/-/g, "_")}`;
}
