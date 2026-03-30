// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import sdfIcon from "@/assets/sdf_icon.svg";

export type RecentFileRowStatus = "signed" | "unsigned" | "invalid" | "unknown";

export type RecentFileRow = {
  id: string;
  name: string;
  modified: string;
  status: RecentFileRowStatus;
};

export function formatRelativeOpenedAt(iso: string, t: TFunction): string {
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, Date.now() - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("time.minutesAgo", { count: 1 });
  if (mins < 60) return t("time.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("time.yesterday");
  return t("time.daysAgo", { count: days });
}

function StatusBadge({ status }: { status: RecentFileRowStatus }) {
  const { t } = useTranslation();
  if (status === "unknown")
    return (
      <Badge variant="secondary" className="font-normal opacity-90">
        {t("dashboard.signatureUnknown")}
      </Badge>
    );
  if (status === "signed")
    return (
      <Badge variant="success">
        <CheckCircle className="h-2.5 w-2.5" />
        {t("dashboard.signed")}
      </Badge>
    );
  if (status === "invalid")
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-2.5 w-2.5" />
        {t("dashboard.invalid")}
      </Badge>
    );
  return <Badge variant="secondary">{t("dashboard.unsigned")}</Badge>;
}

type RecentFilesTableProps = {
  rows: RecentFileRow[];
  onOpen: (path: string) => void;
  emptyMessage: string;
  /** If set, only the first N rows are rendered (dashboard preview). */
  maxRows?: number;
};

export function RecentFilesTable({ rows, onOpen, emptyMessage, maxRows }: RecentFilesTableProps) {
  const visible = maxRows != null ? rows.slice(0, maxRows) : rows;

  return (
    <div className="overflow-hidden rounded-xl border border-[--color-border] bg-[--color-surface] shadow-[--shadow-sm]">
      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[--color-muted-fg]">{emptyMessage}</p>
      ) : (
        visible.map((file, i) => (
          <button
            key={file.id}
            type="button"
            onClick={() => onOpen(file.id)}
            className={cn(
              "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[--color-surface-hover]",
              i < visible.length - 1 && "border-b border-[--color-border-subtle]"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[--color-primary]/20 bg-[--color-primary-muted]">
              <img src={sdfIcon} alt="" className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[--color-fg]">{file.name}</p>
              <p className="text-[11px] text-[--color-muted]">{file.modified}</p>
            </div>

            <StatusBadge status={file.status} />
          </button>
        ))
      )}
    </div>
  );
}
