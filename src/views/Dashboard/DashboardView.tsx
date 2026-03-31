// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Clock,
  Plus,
  TrendingUp,
  Cloud,
  ChevronRight,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import sdfIcon from "@/assets/sdf_icon.svg";
import { openSdfOrPdf } from "@/lib/tauri/dialog";
import { useDocumentStore } from "@/stores/documentStore";
import { useAuth } from "@/hooks/useAuth";
import { createBillingEndpoints } from "@/lib/api/endpoints/billing";
import { queryKeys } from "@/lib/queryKeys";
import { API_BASE_URL, getApiClientTokens } from "@/stores/authStore";
import { formatBytes } from "@/lib/formatBytes";
import {
  RecentFilesTable,
  formatRelativeOpenedAt,
  type RecentFileRow,
} from "@/components/workspace/RecentFilesTable";
import { DashboardUsageChart } from "@/components/dashboard/DashboardUsageChart";

const HOME_RECENT_PREVIEW = 4;

const billingApi = createBillingEndpoints(API_BASE_URL, getApiClientTokens());

interface DashboardViewProps {
  onOpenSdfFile?: (path: string) => void;
  onNewDocument?: () => void;
  onViewAllDocuments?: () => void;
  onOpenCloudLibrary?: () => void;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger" | "amber";
  /** Long values (e.g. storage line) use smaller type. */
  valueSize?: "lg" | "3xl";
}

function StatCard({ label, value, sub, icon, color, valueSize = "3xl" }: StatCardProps) {
  const styles = {
    primary: {
      wrap: "border-[--color-primary]/30 bg-gradient-to-br from-[--color-primary-muted] to-transparent",
      icon: "bg-[--color-primary]/15 text-[--color-primary]",
      value: "text-[--color-primary]",
    },
    success: {
      wrap: "border-[--color-success]/30 bg-gradient-to-br from-[--color-success-muted] to-transparent",
      icon: "bg-[--color-success]/15 text-[--color-success]",
      value: "text-[--color-success]",
    },
    warning: {
      wrap: "border-[--color-warning]/30 bg-gradient-to-br from-[--color-warning-muted] to-transparent",
      icon: "bg-[--color-warning]/15 text-[--color-warning]",
      value: "text-[--color-warning]",
    },
    danger: {
      wrap: "border-[--color-danger]/30 bg-gradient-to-br from-[--color-danger-muted] to-transparent",
      icon: "bg-[--color-danger]/15 text-[--color-danger]",
      value: "text-[--color-danger]",
    },
    amber: {
      wrap: "border-[--color-amber]/30 bg-gradient-to-br from-[--color-amber-muted] to-transparent",
      icon: "bg-[--color-amber]/15 text-[--color-amber]",
      value: "text-[--color-amber]",
    },
  }[color];

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4", styles.wrap)}>
      <div className="flex items-start justify-between">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", styles.icon)}>{icon}</div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[--color-muted]">{label}</p>
      </div>
      <div>
        <p
          className={cn(
            "font-bold tracking-tight leading-tight",
            styles.value,
            valueSize === "lg" ? "text-base sm:text-lg" : "text-3xl"
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-[--color-muted]">{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardView({
  onOpenSdfFile,
  onNewDocument,
  onViewAllDocuments,
  onOpenCloudLibrary,
}: DashboardViewProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const recentFiles = useDocumentStore((s) => s.recentFiles);

  const usageQuery = useQuery({
    queryKey: queryKeys.billing.usage(user?.tenantId),
    queryFn: () => billingApi.usage(),
    enabled: isAuthenticated,
  });

  const docMetric = usageQuery.data?.find((m) => m.metric === "documents");
  const storageMetric = usageQuery.data?.find((m) => m.metric === "storageGb");

  const cloudDocsDisplay = useMemo(() => {
    if (!isAuthenticated) return { value: "—", sub: t("dashboard.statCloudSignIn") };
    if (usageQuery.isLoading) return { value: "…", sub: t("dashboard.statLoading") };
    if (!docMetric) return { value: "—", sub: t("dashboard.statCloudDocsSub") };
    return {
      value: String(docMetric.used),
      sub: t("dashboard.statCloudDocsSubPeriod", {
        limit: docMetric.limit < 0 ? "∞" : String(docMetric.limit),
      }),
    };
  }, [isAuthenticated, usageQuery.isLoading, docMetric, t]);

  const cloudStorageDisplay = useMemo(() => {
    if (!isAuthenticated) return { value: "—", sub: t("dashboard.statCloudSignIn") };
    if (usageQuery.isLoading) return { value: "…", sub: t("dashboard.statLoading") };
    if (!storageMetric) return { value: "—", sub: t("dashboard.statCloudStorageSub") };
    const usedStr = formatBytes(storageMetric.used * 1024 ** 3);
    if (storageMetric.limit < 0) return { value: usedStr, sub: t("dashboard.statCloudStorageSub") };
    return {
      value: `${usedStr} / ${storageMetric.limit} GB`,
      sub: t("dashboard.statCloudStorageSubQuota"),
    };
  }, [isAuthenticated, usageQuery.isLoading, storageMetric, t]);

  const handleOpenFile = useCallback(async () => {
    if (!onOpenSdfFile) return;
    const selected = await openSdfOrPdf();
    if (selected) onOpenSdfFile(selected);
  }, [onOpenSdfFile]);

  const weekCount = useMemo(() => {
    const weekMs = 7 * 86400000;
    const cutoff = Date.now() - weekMs;
    return recentFiles.filter((r) => new Date(r.openedAt).getTime() >= cutoff).length;
  }, [recentFiles]);

  const recentRows = useMemo<RecentFileRow[]>(
    () =>
      recentFiles.map((r) => ({
        id: r.path,
        name: r.label,
        modified: formatRelativeOpenedAt(r.openedAt, t),
        status: "unknown",
      })),
    [recentFiles, t]
  );

  const greetingText = useMemo(() => {
    const h = new Date().getHours();
    let key: "greeting.morning" | "greeting.afternoon" | "greeting.evening" | "greeting.night" = "greeting.night";
    if (h >= 5 && h < 12) key = "greeting.morning";
    else if (h >= 12 && h < 17) key = "greeting.afternoon";
    else if (h >= 17 && h < 21) key = "greeting.evening";
    const name = user?.name?.trim() || user?.email?.split("@")[0] || "—";
    return t(key, { name });
  }, [t, user]);

  const hasMoreLocal = recentFiles.length > HOME_RECENT_PREVIEW;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[--color-bg]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          <div className="relative overflow-hidden rounded-xl border border-[--color-primary]/30 bg-gradient-to-r from-[--color-primary-muted] via-transparent to-transparent px-6 py-5">
            <div className="flex items-center gap-4">
              <img src={sdfIcon} alt="SDF" className="h-10 w-10 rounded-xl shadow-[--shadow-sm]" />
              <div>
                <h1 className="text-lg font-bold leading-tight text-[--color-fg]">{greetingText}</h1>
                <p className="mt-0.5 text-sm text-[--color-muted-fg]">
                  <Trans
                    i18nKey="dashboard.bannerRecentLocal"
                    values={{ count: recentFiles.length }}
                    components={{
                      highlight: <span className="font-semibold text-[--color-amber]" />,
                    }}
                  />
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" size="sm" className="gap-2 shadow-[--shadow-sm]" onClick={() => onNewDocument?.()}>
                  <span
                    className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-[--color-primary-fg]/35 bg-[--color-primary-fg]/12"
                    aria-hidden
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  {t("dashboard.newDocument")}
                </Button>
                <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void handleOpenFile()}>
                  <Upload className="h-3.5 w-3.5" />
                  {t("dashboard.openFile")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t("dashboard.statRecentLocal")}
              value={String(recentFiles.length)}
              sub={t("dashboard.statRecentLocalSub")}
              icon={<FileText className="h-4 w-4" />}
              color="primary"
            />
            <StatCard
              label={t("dashboard.statWeek")}
              value={String(weekCount)}
              sub={t("dashboard.statWeekSub")}
              icon={<TrendingUp className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              label={t("dashboard.statCloudDocs")}
              value={cloudDocsDisplay.value}
              sub={cloudDocsDisplay.sub}
              icon={<Cloud className="h-4 w-4" />}
              color="success"
            />
            <StatCard
              label={t("dashboard.statCloudStorage")}
              value={cloudStorageDisplay.value}
              sub={cloudStorageDisplay.sub}
              icon={<HardDrive className="h-4 w-4" />}
              color="primary"
              valueSize="lg"
            />
          </div>

          {isAuthenticated && onOpenCloudLibrary && (
            <button
              type="button"
              onClick={onOpenCloudLibrary}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-3 text-left shadow-[--shadow-sm] transition-colors hover:bg-[--color-surface-hover]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[--color-primary-muted] text-[--color-primary]">
                  <Cloud className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[--color-fg]">{t("dashboard.cloudLibraryTitle")}</p>
                  <p className="text-xs text-[--color-muted-fg]">{t("dashboard.cloudLibrarySubtitle")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[--color-muted]" aria-hidden />
            </button>
          )}

          <DashboardUsageChart />

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[--color-muted]" />
                <h2 className="text-sm font-semibold text-[--color-fg]">{t("dashboard.recentPreview")}</h2>
              </div>
              {onViewAllDocuments && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={onViewAllDocuments}>
                  {hasMoreLocal ? t("dashboard.viewAllDocuments") : t("dashboard.openLocalLibrary")}
                </Button>
              )}
            </div>

            <RecentFilesTable
              rows={recentRows}
              onOpen={(p) => onOpenSdfFile?.(p)}
              emptyMessage={t("dashboard.recentEmpty")}
              maxRows={HOME_RECENT_PREVIEW}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
