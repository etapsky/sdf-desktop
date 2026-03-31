// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { TFunction } from "i18next";
import { ApiHttpError } from "@/lib/api/client";

/**
 * Maps API / transport errors to localized, user-safe copy (no raw stack traces).
 */
export function formatAuthError(t: TFunction, err: unknown): string {
  if (err instanceof ApiHttpError) {
    switch (err.code) {
      case "UNAUTHORIZED":
        return t("auth.errors.unauthorized");
      case "VALIDATION_ERROR":
        return t("auth.errors.validation");
      case "CONFLICT":
        return t("auth.errors.conflict");
      case "NOT_FOUND":
        return t("auth.errors.notFound");
      case "FORBIDDEN":
        return t("auth.errors.forbidden");
      case "RATE_LIMITED":
        return t("auth.errors.rateLimited");
      case "PLAN_LIMIT_EXCEEDED":
        return t("auth.errors.planLimit");
      case "NETWORK":
        return t("auth.errors.network");
      case "SSO_FAILED":
        return err.message || t("auth.errors.generic");
      default:
        break;
    }

    if (err.statusCode === 0) return t("auth.errors.network");
    if (err.statusCode === 401) return t("auth.errors.unauthorized");
    if (err.statusCode === 403) return t("auth.errors.forbidden");
    if (err.statusCode === 404) return t("auth.errors.notFound");
    if (err.statusCode === 409) return t("auth.errors.conflict");
    if (err.statusCode === 429) return t("auth.errors.rateLimited");
    if (err.statusCode === 402) return t("auth.errors.planLimit");
    if (err.statusCode >= 500) return t("auth.errors.server");
    if (err.statusCode >= 400) return t("auth.errors.badRequest");
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return t("auth.errors.generic");
}
