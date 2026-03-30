// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNetworkOnline } from "@/hooks/useNetworkOnline";

/**
 * Global connectivity / future cloud sync slot.
 *
 * Today: online vs offline (`navigator.onLine`). Faz 2: replace with real sync
 * states (syncing / synced / error) driven by API + `useCloudSync`.
 */
export function CloudConnectivityBadge() {
  const { t } = useTranslation();
  const online = useNetworkOnline();

  if (online) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--color-success)_22%,var(--color-surface-elevated))] px-2 py-1 shadow-[--shadow-sm]"
        title={t("header.cloudOnlineHint")}
        role="status"
        aria-label={t("header.cloudOnlineHint")}
      >
        <Wifi className="h-4 w-4 shrink-0 stroke-2 text-[--color-success]" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md bg-[color-mix(in_oklch,var(--color-danger)_20%,var(--color-surface-elevated))] px-2.5 py-1 text-[10px] font-semibold text-[--color-danger] shadow-[--shadow-sm]"
      title={t("header.cloudOfflineHint")}
      role="status"
      aria-label={t("header.cloudOfflineHint")}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 stroke-[2]" aria-hidden />
      <span className="hidden sm:inline">{t("header.offlineShort")}</span>
    </span>
  );
}
