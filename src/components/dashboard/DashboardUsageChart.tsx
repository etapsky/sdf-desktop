// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { createBillingEndpoints } from "@/lib/api/endpoints/billing";
import { queryKeys } from "@/lib/queryKeys";
import { API_BASE_URL, getApiClientTokens } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const billingApi = createBillingEndpoints(API_BASE_URL, getApiClientTokens());

const USAGE_SERIES_DAYS = 30;

/** Chart area height scales with viewport; parent must have explicit height for ResponsiveContainer. */
const chartWrapClass =
  "h-[clamp(12rem,28vw,20rem)] w-full min-h-[200px] max-h-[320px] sm:min-h-[220px]";

export function DashboardUsageChart() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  /** Colons in React useId() can break SVG fragment refs in some engines. */
  const uid = useId().replace(/:/g, "");
  const gCalls = `${uid}-usage-calls`;
  const gDocs = `${uid}-usage-docs`;

  const query = useQuery({
    queryKey: queryKeys.billing.usageSeries(USAGE_SERIES_DAYS),
    queryFn: () => billingApi.usageSeries(USAGE_SERIES_DAYS),
    enabled: isAuthenticated,
  });

  const chartData = useMemo(() => {
    return (query.data ?? []).map((d) => ({
      date: new Date(d.date).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
      documents: d.documents,
      apiCalls: d.apiCalls,
    }));
  }, [query.data, i18n.language]);

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-8 text-center shadow-[--shadow-sm]",
          chartWrapClass,
          "flex items-center justify-center"
        )}
      >
        <p className="text-sm text-[--color-muted-fg]">{t("dashboard.statCloudSignIn")}</p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl border border-[--color-border] bg-[--color-surface] shadow-[--shadow-sm]",
          chartWrapClass
        )}
      />
    );
  }

  if (query.isError) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-6 text-center shadow-[--shadow-sm]",
          chartWrapClass,
          "flex items-center justify-center"
        )}
      >
        <p className="text-sm text-[--color-muted-fg]">{t("dashboard.usageChartError")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-[--shadow-sm]">
      <h3 className="mb-3 text-sm font-semibold text-[--color-fg]">{t("dashboard.usageChartTitle")}</h3>
      <div className={chartWrapClass}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gCalls} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={gDocs} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-muted-fg)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-fg)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--color-fg)",
              }}
            />
            <Area
              type="monotone"
              dataKey="apiCalls"
              name={t("dashboard.usageSeriesApiCalls")}
              stroke="var(--color-primary)"
              fill={`url(#${gCalls})`}
              strokeWidth={1.5}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="documents"
              name={t("dashboard.usageSeriesDocuments")}
              stroke="var(--color-accent)"
              fill={`url(#${gDocs})`}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
