// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TOAST_VARIANT_CONFIG, type ToastVariant } from "@/components/notifications/toastVariantConfig";

export type { ToastVariant } from "@/components/notifications/toastVariantConfig";

export type ToastInput = {
  variant: ToastVariant;
  title: string;
  message?: string;
  durationMs?: number;
};

type Toast = ToastInput & { id: string };

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: ToastInput) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const next: Toast = { ...toast, id, durationMs: toast.durationMs ?? DEFAULT_DURATION_MS };

    setToasts((prev) => [...prev, next]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, next.durationMs);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2">
      {toasts.map((t) => {
        const ui = TOAST_VARIANT_CONFIG[t.variant];
        const Icon = ui.Icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto min-w-0 rounded-xl border border-[--color-border-subtle]",
              "border-l-4 text-[--color-fg] shadow-[--shadow-lg] backdrop-blur-[2px]",
              ui.panelTintClass,
              ui.accentBorderClass
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex gap-3 px-4 py-3">
              <Icon
                className={cn("h-5 w-5 shrink-0 stroke-[2]", ui.iconClassName)}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug tracking-tight text-[--color-fg]">
                  {t.title}
                </div>
                {t.message && (
                  <div className="mt-1.5 break-words text-xs leading-relaxed text-[--color-muted-fg]">
                    {t.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
