// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

/** Web portal base (billing, team, API keys). Override with `VITE_PORTAL_BASE_URL`. */
export function getPortalBaseUrl(): string {
  const raw = (import.meta.env.VITE_PORTAL_BASE_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://portal.etapsky.com";
}

export function getPortalBillingUrl(): string {
  return `${getPortalBaseUrl()}/billing`;
}
