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

/** Compact plot height; small axis ticks keep labels from dominating. */
const chartWrapClass =
  "h-[clamp(9rem,22vw,13rem)] w-full min-h-[148px] max-h-[200px] sm:min-h-[156px]";

export function DashboardUsageChart() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  /** Colons in React useId() can break SVG fragment refs in some engines. */
  const uid = useId().replace(/:/g, "");
  const gStorage = `${uid}-usage-storage`;
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
      storageGb: d.storageGb,
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
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] px-3 pb-2 pt-2 shadow-[--shadow-sm]">
      <h3 className="mb-1 text-xs font-semibold leading-tight text-[--color-fg]">
        {t("dashboard.usageChartTitle")}
      </h3>
      <div className={chartWrapClass}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gStorage} x1="0" y1="0" x2="0" y2="1">
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
              tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
              tickMargin={2}
              height={22}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
              tickMargin={4}
              width={36}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => String(Math.round(v))}
              domain={[0, (max: number) => (max <= 0 ? 1 : Math.ceil(max * 1.12))]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
              tickMargin={4}
              width={44}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return "";
                if (n === 0) return "0";
                if (n < 0.01) return n.toFixed(4);
                if (n < 1) return n.toFixed(3);
                return n.toFixed(2);
              }}
              domain={[0, (max: number) => (max <= 0 ? 0.0001 : max * 1.15)]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "11px",
                lineHeight: "1.25",
                padding: "6px 8px",
                color: "var(--color-fg)",
              }}
              formatter={(value: number | string, name: string) => {
                if (name === t("dashboard.usageSeriesStorageGb")) {
                  const n = typeof value === "number" ? value : Number(value);
                  return [`${Number.isFinite(n) ? n.toFixed(4) : value} GB`, name];
                }
                return [value, name];
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="documents"
              name={t("dashboard.usageSeriesDocuments")}
              stroke="var(--color-accent)"
              fill={`url(#${gDocs})`}
              strokeWidth={1.5}
              dot={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="storageGb"
              name={t("dashboard.usageSeriesStorageGb")}
              stroke="var(--color-primary)"
              fill={`url(#${gStorage})`}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
