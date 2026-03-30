// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useId, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/notifications/ToastProvider";
import { describeApiError } from "@/lib/api/client";
import { downloadInstallAndRelaunch, type InstallProgress } from "@/lib/updater/installUpdate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update: Update | null;
};

export function UpdateAvailableDialog({ open, onOpenChange, update }: Props) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const titleId = useId();
  const descId = useId();
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);

  useEffect(() => {
    if (!open) {
      setInstalling(false);
      setProgress(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !installing) {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, installing, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleBackdropPointerDown = (e: SyntheticEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || installing) return;
    onOpenChange(false);
  };

  const pct =
    progress?.total && progress.total > 0
      ? Math.min(100, Math.round((100 * progress.downloaded) / progress.total))
      : null;

  const handleInstall = async () => {
    if (!update) return;
    setInstalling(true);
    try {
      await downloadInstallAndRelaunch(update, setProgress);
    } catch (e) {
      setInstalling(false);
      notify({
        variant: "error",
        title: t("updater.installFailedTitle"),
        message: describeApiError(e),
      });
    }
  };

  if (!open || !update) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onPointerDown={handleBackdropPointerDown}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[201] w-full max-w-md rounded-xl border border-[--color-border] bg-[--color-surface-elevated] p-5 shadow-[--shadow-lg]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[--color-primary-muted] text-[--color-primary]">
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-[--color-fg]">
              {t("updater.title")}
            </h2>
            <p id={descId} className="mt-1 text-sm text-[--color-muted-fg]">
              {t("updater.subtitle", { version: update.version, current: update.currentVersion })}
            </p>
          </div>
        </div>

        {update.body ? (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-[--color-border-subtle] bg-[--color-bg] px-3 py-2 text-xs text-[--color-fg] whitespace-pre-wrap">
            {update.body}
          </div>
        ) : null}

        {installing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[--color-muted-fg]">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
              {t("updater.downloading")}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--color-border-subtle]">
              <div
                className="h-full rounded-full bg-[--color-primary] transition-[width] duration-300"
                style={{ width: pct != null ? `${pct}%` : "100%" }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={installing} onClick={() => onOpenChange(false)}>
            {t("updater.later")}
          </Button>
          <Button type="button" className="gap-2" disabled={installing} onClick={() => void handleInstall()}>
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t("updater.installRestart")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
