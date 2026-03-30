// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Upload } from "lucide-react";
import { openSdfOrPdf } from "@/lib/tauri/dialog";
import { useDocumentStore } from "@/stores/documentStore";
import {
  RecentFilesTable,
  formatRelativeOpenedAt,
  type RecentFileRow,
} from "@/components/workspace/RecentFilesTable";

type DocumentsViewProps = {
  onOpenSdfFile?: (path: string) => void;
  onNewDocument?: () => void;
};

export function DocumentsView({ onOpenSdfFile, onNewDocument }: DocumentsViewProps) {
  const { t } = useTranslation();
  const recentFiles = useDocumentStore((s) => s.recentFiles);

  const handleOpenFile = useCallback(async () => {
    if (!onOpenSdfFile) return;
    const selected = await openSdfOrPdf();
    if (selected) onOpenSdfFile(selected);
  }, [onOpenSdfFile]);

  const rows = useMemo<RecentFileRow[]>(
    () =>
      recentFiles.map((r) => ({
        id: r.path,
        name: r.label,
        modified: formatRelativeOpenedAt(r.openedAt, t),
        status: "unknown",
      })),
    [recentFiles, t]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[--color-bg]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--color-primary-muted]">
                  <FileText className="h-4 w-4 text-[--color-primary]" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-[--color-fg]">{t("documents.title")}</h1>
              </div>
              <p className="mt-1 max-w-xl text-sm text-[--color-muted-fg]">{t("documents.subtitle")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
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

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[--color-fg]">{t("documents.localRecent")}</h2>
            <RecentFilesTable rows={rows} onOpen={(p) => onOpenSdfFile?.(p)} emptyMessage={t("dashboard.recentEmpty")} />
          </section>
        </div>
      </div>
    </div>
  );
}
