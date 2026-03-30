// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/** Tek kaynak: toast / bildirim görünümü (ikon + renk + yarı saydam zemin). */
export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastVariantUi = {
  Icon: LucideIcon;
  /** İkon rengi — semantic token */
  iconClassName: string;
  /** Panel: elevated yüzey üzerine hafif renkli cam efekti */
  panelTintClass: string;
  /** Sol vurgu çizgisi rengi */
  accentBorderClass: string;
};

export const TOAST_VARIANT_CONFIG: Record<ToastVariant, ToastVariantUi> = {
  success: {
    Icon: CheckCircle2,
    iconClassName: "text-[--color-success]",
    panelTintClass:
      "bg-[color-mix(in_oklch,var(--color-success)_28%,var(--color-surface-elevated))]",
    accentBorderClass: "border-l-[--color-success]",
  },
  error: {
    Icon: XCircle,
    iconClassName: "text-[--color-danger]",
    panelTintClass:
      "bg-[color-mix(in_oklch,var(--color-danger)_26%,var(--color-surface-elevated))]",
    accentBorderClass: "border-l-[--color-danger]",
  },
  warning: {
    Icon: AlertTriangle,
    iconClassName: "text-[--color-warning]",
    panelTintClass:
      "bg-[color-mix(in_oklch,var(--color-warning)_24%,var(--color-surface-elevated))]",
    accentBorderClass: "border-l-[--color-warning]",
  },
  info: {
    Icon: Info,
    iconClassName: "text-[--color-primary]",
    panelTintClass:
      "bg-[color-mix(in_oklch,var(--color-primary)_22%,var(--color-surface-elevated))]",
    accentBorderClass: "border-l-[--color-primary]",
  },
};
