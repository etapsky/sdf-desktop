// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Download, FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useToast } from "@/components/notifications/ToastProvider";
import { describeApiError } from "@/lib/api/client";
import { saveSdfArrayBuffer } from "@/lib/tauri/dialog";
import { writeTempSdfFile } from "@/lib/tauri/fs";
import { formatBytes } from "@/lib/formatBytes";
import sdfIcon from "@/assets/sdf_icon.svg";

type CloudSyncViewProps = {
  onOpenLocalDocuments?: () => void;
  onOpenSdfFile?: (path: string) => void;
};

export function CloudSyncView({ onOpenLocalDocuments, onOpenSdfFile }: CloudSyncViewProps) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { documentsQuery, usageQuery, uploadMutation, deleteMutation, downloadBytes } = useCloudSync();

  const docUsage = usageQuery.data?.find((m) => m.metric === "documents");
  const storageUsage = usageQuery.data?.find((m) => m.metric === "storageGb");

  const onPickUpload = () => fileRef.current?.click();

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".sdf")) {
        notify({ variant: "error", title: t("cloud.uploadWrongType") });
        return;
      }
      try {
        await uploadMutation.mutateAsync(file);
        notify({ variant: "success", title: t("cloud.uploadSuccess", { name: file.name }) });
      } catch (e) {
        notify({ variant: "error", title: t("cloud.uploadFailed"), message: describeApiError(e) });
      }
    },
    [notify, t, uploadMutation]
  );

  const handleDownload = useCallback(
    async (id: string, filename: string) => {
      try {
        const buf = await downloadBytes(id);
        const savedPath = await saveSdfArrayBuffer(buf, filename);
        if (!savedPath) return;
        notify({ variant: "success", title: t("cloud.downloadSuccess", { name: filename }) });
      } catch (e) {
        notify({ variant: "error", title: t("cloud.downloadFailed"), message: describeApiError(e) });
      }
    },
    [downloadBytes, notify, t]
  );

  const handleOpenCloudFile = useCallback(
    async (id: string, filename: string) => {
      try {
        const buf = await downloadBytes(id);
        const tempPath = await writeTempSdfFile(buf, filename);
        if (tempPath && onOpenSdfFile) {
          // Open directly in reader; no save dialog for view action.
          if (onOpenLocalDocuments) onOpenLocalDocuments();
          onOpenSdfFile(tempPath);
        }
      } catch (e) {
        notify({ variant: "error", title: t("cloud.downloadFailed"), message: describeApiError(e) });
      }
    },
    [downloadBytes, notify, onOpenLocalDocuments, onOpenSdfFile, t]
  );

  const handleDelete = useCallback(
    async (id: string, filename: string) => {
      if (!window.confirm(t("cloud.deleteConfirm", { name: filename }))) return;
      try {
        await deleteMutation.mutateAsync(id);
        notify({ variant: "success", title: t("cloud.deleteSuccess", { name: filename }) });
      } catch (e) {
        notify({ variant: "error", title: t("cloud.deleteFailed"), message: describeApiError(e) });
      }
    },
    [deleteMutation, notify, t]
  );

  const busy = documentsQuery.isFetching || usageQuery.isFetching;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-[--color-fg]">{t("cloud.title")}</h1>
        <p className="text-sm text-[--color-muted-fg]">{t("cloud.description")}</p>
      </div>

      {onOpenLocalDocuments && (
        <button
          type="button"
          onClick={onOpenLocalDocuments}
          className="flex w-full max-w-xl items-center justify-between gap-3 rounded-lg border border-[--color-border] bg-[--color-surface] px-3 py-2.5 text-left text-sm shadow-[--shadow-sm] transition-colors hover:bg-[--color-surface-hover]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[--color-border-subtle] bg-[--color-surface-elevated] text-[--color-primary]">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[--color-fg]">{t("cloud.linkLocalDocuments")}</span>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[--color-muted]" aria-hidden />
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuotaCard
          label={t("cloud.quotaDocuments")}
          used={docUsage?.used ?? 0}
          limit={docUsage?.limit ?? -1}
          loading={usageQuery.isLoading}
        />
        <QuotaCard
          label={t("cloud.quotaStorage")}
          used={storageUsage?.used ?? 0}
          limit={storageUsage?.limit ?? -1}
          unit="gb"
          loading={usageQuery.isLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".sdf,application/vnd.sdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleUpload(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={onPickUpload}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {t("cloud.upload")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void documentsQuery.refetch()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          {t("cloud.refresh")}
        </Button>
      </div>

      {documentsQuery.isError && (
        <div
          role="alert"
          className="rounded-lg border border-[--color-danger]/35 bg-[color-mix(in_oklch,var(--color-danger)_12%,var(--color-surface-elevated))] px-3 py-2 text-sm text-[--color-danger]"
        >
          {describeApiError(documentsQuery.error)}
        </div>
      )}

      {!documentsQuery.isLoading && documentsQuery.data?.data.length === 0 && (
        <p className="text-sm text-[--color-muted-fg]">{t("cloud.empty")}</p>
      )}

      {documentsQuery.data && documentsQuery.data.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[--color-border] bg-[--color-surface-elevated]">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-bg] text-[--color-muted-fg]">
                <th className="px-3 py-2 font-medium">{t("cloud.colName")}</th>
                <th className="px-3 py-2 font-medium">{t("cloud.colSize")}</th>
                <th className="px-3 py-2 font-medium">{t("cloud.colStatus")}</th>
                <th className="w-[1%] whitespace-nowrap px-3 py-2 font-medium">{t("cloud.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {documentsQuery.data.data.map((row) => (
                <tr key={row.id} className="border-b border-[--color-border-subtle] last:border-0">
                  <td className="max-w-[min(320px,45vw)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CloudFileGlyph filename={row.filename} />
                      <button
                        type="button"
                        className="truncate font-medium text-[--color-fg] underline decoration-[--color-border] underline-offset-3 transition-colors hover:text-[--color-primary]"
                        title={row.filename}
                        onClick={() => void handleOpenCloudFile(row.id, row.filename)}
                      >
                        {row.filename}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[--color-muted-fg]">{formatBytes(row.size)}</td>
                  <td className="px-3 py-2 text-[--color-muted-fg]">{row.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title={t("cloud.download")}
                        onClick={() => void handleDownload(row.id, row.filename)}
                      >
                        <Download className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-[--color-danger] hover:text-[--color-danger]"
                        title={t("cloud.delete")}
                        onClick={() => void handleDelete(row.id, row.filename)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {documentsQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-[--color-muted-fg]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("cloud.loading")}
        </div>
      )}
    </div>
  );
}

function isSdfFilename(name: string): boolean {
  return name.toLowerCase().endsWith(".sdf");
}

/** Portal-style: SDF logo for `.sdf`, generic file icon otherwise. */
function CloudFileGlyph({ filename }: { filename: string }) {
  if (isSdfFilename(filename)) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[--color-primary]/20 bg-[--color-primary-muted]">
        <img src={sdfIcon} alt="" className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[--color-border-subtle] bg-[--color-surface-elevated]">
      <FileText className="h-4 w-4 text-[--color-muted-fg]" aria-hidden />
    </span>
  );
}

function QuotaCard({
  label,
  used,
  limit,
  unit = "count",
  loading,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: "count" | "gb";
  loading: boolean;
}) {
  const { t } = useTranslation();
  const pct =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : limit === -1 ? 0 : 0;
  const showBar = limit > 0;

  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface-elevated] p-3">
      <div className="text-xs font-medium text-[--color-muted-fg]">{label}</div>
      {loading ? (
        <div className="mt-2 h-6 animate-pulse rounded bg-[--color-border-subtle]" />
      ) : (
        <>
          <div className="mt-1 text-sm font-semibold text-[--color-fg]">
            {unit === "gb" ? (
              /* API returns `used` in GB; sub-GB totals were shown as "0.00" with toFixed(2). */
              t("cloud.quotaStorageLine", {
                used: formatBytes(used * 1024 ** 3),
                limit: limit < 0 ? "∞" : t("cloud.quotaStorageLimitGb", { gb: limit }),
              })
            ) : (
              t("cloud.quotaValueDocs", { used, limit: limit < 0 ? "∞" : limit })
            )}
          </div>
          {showBar && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[--color-border-subtle]">
              <div
                className="h-full rounded-full bg-[--color-primary]"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
