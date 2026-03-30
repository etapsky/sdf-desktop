// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useId, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/notifications/ToastProvider";
import { signSdfDocument } from "@/lib/tauri/sign";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absolutePath: string;
  filename: string;
  /** Called after a successful cryptographic sign (Faz 3); use to refresh validation UI. */
  onSigned?: () => void;
};

/**
 * Local SDF signing flow (fixed overlay — avoids native `<dialog>` positioning quirks in WebView).
 */
export function SignSdfDialog({
  open,
  onOpenChange,
  absolutePath,
  filename,
  onSigned,
}: Props) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const titleId = useId();
  const descId = useId();
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!open) setSigning(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !signing) {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, signing, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleBackdropPointerDown = (e: SyntheticEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || signing) return;
    onOpenChange(false);
  };

  const handleSign = async () => {
    setSigning(true);
    try {
      const result = await signSdfDocument(absolutePath);
      if (result.status === "signed") {
        notify({
          variant: "success",
          title: t("producer.signSuccessTitle"),
          message: t("producer.signSuccessBody", { file: filename }),
        });
        onSigned?.();
        onOpenChange(false);
        return;
      }
      if (result.status === "not_implemented") {
        notify({
          variant: "info",
          title: t("producer.signNotImplementedTitle"),
          message: t("producer.signNotImplementedBody"),
        });
        return;
      }
      notify({
        variant: "warning",
        title: t("producer.signUnsupportedTitle"),
        message: t("producer.signUnsupportedBody"),
      });
    } catch (err) {
      notify({
        variant: "error",
        title: t("producer.signErrorTitle"),
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSigning(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-[oklch(0%_0_0/0.42)] backdrop-blur-[3px]"
        aria-hidden
        onPointerDown={handleBackdropPointerDown}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[10001] flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[--color-border] bg-[var(--color-surface)] text-[--color-fg] shadow-[var(--shadow-lg)]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[--color-border-subtle] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--color-accent)_42%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_22%,var(--color-surface))] text-[var(--color-accent)] shadow-[inset_0_1px_0_oklch(100%_0_0/0.12)]">
              <FileSignature className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold leading-tight">
                {t("producer.signDialogTitle")}
              </h2>
              <p id={descId} className="mt-1 text-sm text-[--color-muted]">
                {t("producer.signDialogDescription")}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[--color-muted]">
              {t("producer.signTargetFile")}
            </div>
            <div
              className="mt-1 truncate font-mono text-xs text-[var(--color-accent)]"
              title={absolutePath}
            >
              {filename}
            </div>
          </div>

          <ol className="list-decimal space-y-2 pl-5 text-sm text-[--color-muted-fg]">
            <li className="marker:text-[--color-muted]">{t("producer.signStepVerify")}</li>
            <li className="marker:text-[--color-muted]">{t("producer.signStepCertificate")}</li>
            <li className="marker:text-[--color-muted]">{t("producer.signStepApply")}</li>
          </ol>
        </div>

        <div className="flex justify-end gap-2 border-t border-[--color-border-subtle] bg-[var(--color-surface)] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={signing}
            className="border-[color-mix(in_oklch,var(--color-warning)_55%,var(--color-border))] bg-[color-mix(in_oklch,var(--color-warning)_14%,var(--color-surface))] text-[var(--color-warning)] hover:bg-[color-mix(in_oklch,var(--color-warning)_22%,var(--color-surface))]"
            onClick={() => onOpenChange(false)}
          >
            {t("producer.signCancel")}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={signing}
            className="gap-1.5 bg-[color-mix(in_oklch,var(--color-primary)_82%,var(--color-accent))] text-[var(--color-primary-fg)] hover:bg-[color-mix(in_oklch,var(--color-primary-hover)_85%,var(--color-accent))]"
            onClick={handleSign}
          >
            {signing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileSignature
                className="h-3.5 w-3.5 text-[var(--color-primary-fg)]"
                strokeWidth={2.25}
                aria-hidden
              />
            )}
            {signing ? t("producer.signInProgress") : t("producer.signStart")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
