// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { Update } from "@tauri-apps/plugin-updater";
import { useToast } from "@/components/notifications/ToastProvider";
import { fetchAvailableUpdate } from "@/lib/updater/fetchUpdate";
import { describeApiError } from "@/lib/api/client";
import { UpdateAvailableDialog } from "@/components/updater/UpdateAvailableDialog";

const STARTUP_CHECK_DELAY_MS = 6_000;

type UpdaterContextValue = {
  checkForUpdatesManual: () => Promise<void>;
  checkingManual: boolean;
};

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function useUpdater(): UpdaterContextValue {
  const v = useContext(UpdaterContext);
  if (!v) throw new Error("useUpdater must be used within UpdaterProvider");
  return v;
}

export function useUpdaterOptional(): UpdaterContextValue | null {
  return useContext(UpdaterContext);
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<Update | null>(null);
  const [checkingManual, setCheckingManual] = useState(false);
  const pendingRef = useRef<Update | null>(null);

  const openWhenAvailable = useCallback((u: Update) => {
    pendingRef.current = u;
    setPending(u);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const u = await fetchAvailableUpdate();
          if (u) openWhenAvailable(u);
        } catch {
          /* Startup: fail silently (offline, no release yet, dev). */
        }
      })();
    }, STARTUP_CHECK_DELAY_MS);
    return () => clearTimeout(id);
  }, [openWhenAvailable]);

  const checkForUpdatesManual = useCallback(async () => {
    setCheckingManual(true);
    try {
      const u = await fetchAvailableUpdate();
      if (u) {
        openWhenAvailable(u);
        return;
      }
      notify({
        variant: "success",
        title: t("updater.noUpdateTitle"),
        message: t("updater.noUpdateBody"),
      });
    } catch (e) {
      notify({
        variant: "error",
        title: t("updater.checkFailedTitle"),
        message: describeApiError(e),
      });
    } finally {
      setCheckingManual(false);
    }
  }, [notify, openWhenAvailable, t]);

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      const u = pendingRef.current;
      pendingRef.current = null;
      setPending(null);
      if (u) void u.close().catch(() => {});
    }
  }, []);

  const value = useMemo<UpdaterContextValue>(
    () => ({ checkForUpdatesManual, checkingManual }),
    [checkForUpdatesManual, checkingManual]
  );

  return (
    <UpdaterContext.Provider value={value}>
      {children}
      <UpdateAvailableDialog open={dialogOpen} onOpenChange={handleDialogChange} update={pending} />
    </UpdaterContext.Provider>
  );
}
