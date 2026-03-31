// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBillingEndpoints } from "@/lib/api/endpoints/billing";
import { describeApiError } from "@/lib/api/client";
import { formatBytes } from "@/lib/formatBytes";
import { getPortalBillingUrl } from "@/lib/portalUrl";
import { queryKeys } from "@/lib/queryKeys";
import { API_BASE_URL, getApiClientTokens } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";

const billingApi = createBillingEndpoints(API_BASE_URL, getApiClientTokens());

function formatLimit(n: number): string {
  return n < 0 ? "∞" : String(n);
}

function UsageMeter({
  label,
  used,
  limit,
  valueLabel,
}: {
  label: string;
  used: number;
  limit: number;
  valueLabel: string;
}) {
  const max = limit < 0 ? 0 : limit;
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const showBar = max > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-between gap-1 text-sm">
        <span className="text-[--color-muted-fg]">{label}</span>
        <span className="font-medium tabular-nums text-[--color-fg]">{valueLabel}</span>
      </div>
      {showBar && (
        <div className="h-1.5 overflow-hidden rounded-full bg-[--color-border-subtle]">
          <div className="h-full rounded-full bg-[--color-primary]" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

async function openBillingPortal() {
  const url = getPortalBillingUrl();
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function SettingsBillingSection() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const planQuery = useQuery({
    queryKey: queryKeys.billing.plan(),
    queryFn: () => billingApi.plan(),
    enabled: isAuthenticated,
  });

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: () => billingApi.subscription(),
    enabled: isAuthenticated,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.billing.usage(user?.tenantId),
    queryFn: () => billingApi.usage(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  const loading = planQuery.isLoading || subscriptionQuery.isLoading || usageQuery.isLoading;
  const err =
    planQuery.error ?? subscriptionQuery.error ?? usageQuery.error
      ? describeApiError(planQuery.error ?? subscriptionQuery.error ?? usageQuery.error)
      : null;

  const docMetric = usageQuery.data?.find((m) => m.metric === "documents");
  const apiMetric = usageQuery.data?.find((m) => m.metric === "apiCalls");
  const storageMetric = usageQuery.data?.find((m) => m.metric === "storageGb");

  const periodEnd = subscriptionQuery.data?.currentPeriodEnd;
  const periodLabel =
    periodEnd &&
    t("settings.billingPeriodEnd", {
      date: new Date(periodEnd).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    });

  const plan = planQuery.data;
  const sub = subscriptionQuery.data;

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[--color-muted]">
        {t("settings.billingSection")}
      </h2>
      <div className="space-y-4 rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-4 shadow-[--shadow-sm]">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[--color-muted-fg]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("settings.billingLoading")}
          </div>
        )}

        {err && !loading && (
          <p className="text-sm text-[--color-danger]" role="alert">
            {err}
          </p>
        )}

        {!loading && plan && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[--color-fg]">{plan.name}</h3>
                {sub && (
                  <Badge variant={sub.status === "active" ? "success" : "secondary"}>{sub.status}</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[--color-muted-fg]">
                {t("settings.billingPriceLine", {
                  price: plan.priceMonthly.toFixed(2),
                })}
                {periodLabel ? ` · ${periodLabel}` : ""}
              </p>
              {plan.features.length > 0 && (
                <ul className="mt-3 grid gap-1 text-sm text-[--color-muted-fg] sm:grid-cols-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <span className="text-[--color-success]">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => void openBillingPortal()}
            >
              {t("settings.billingOpenPortal")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        )}

        {!loading && usageQuery.data && (
          <div className="space-y-4 border-t border-[--color-border-subtle] pt-4">
            <h4 className="text-sm font-semibold text-[--color-fg]">{t("settings.billingUsageTitle")}</h4>

            {docMetric && (
              <UsageMeter
                label={t("settings.billingMeterDocuments")}
                used={docMetric.used}
                limit={docMetric.limit}
                valueLabel={`${docMetric.used} / ${formatLimit(docMetric.limit)}`}
              />
            )}

            {apiMetric && (
              <UsageMeter
                label={t("settings.billingMeterApi")}
                used={apiMetric.used}
                limit={apiMetric.limit}
                valueLabel={`${apiMetric.used.toLocaleString()} / ${formatLimit(apiMetric.limit)}`}
              />
            )}

            {storageMetric && (
              <UsageMeter
                label={t("settings.billingMeterStorage")}
                used={storageMetric.used}
                limit={storageMetric.limit}
                valueLabel={
                  storageMetric.limit < 0
                    ? `${formatBytes(storageMetric.used * 1024 ** 3)} / ∞`
                    : `${formatBytes(storageMetric.used * 1024 ** 3)} / ${storageMetric.limit} GB`
                }
              />
            )}

            <p className="text-xs text-[--color-muted-fg]">{t("settings.billingUsageHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
