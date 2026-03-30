// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fileNameFromPath } from "@/lib/utils";

const MAX_RECENT = 20;

export type RecentFileEntry = {
  path: string;
  label: string;
  openedAt: string;
};

interface DocumentStore {
  /** Açık sekme sırası (sol → sağ), benzersiz path */
  openTabs: string[];
  /** Reader’da görünen dosya; `null` = dashboard / diğer görünümler */
  activePath: string | null;
  recentFiles: RecentFileEntry[];

  /** Recent + sekme + reader aç */
  openFile: (path: string) => void;
  /** Sadece recent (ör. Producer kaydı); sekme açmaz */
  addRecent: (path: string) => void;
  setActiveTab: (path: string) => void;
  closeTab: (path: string) => void;
  /** Sidebar / dashboard’a dön; sekmeleri açık tutar */
  leaveReader: () => void;
}

function pushRecent(prev: RecentFileEntry[], path: string): RecentFileEntry[] {
  const label = fileNameFromPath(path);
  const openedAt = new Date().toISOString();
  const without = prev.filter((r) => r.path !== path);
  return [{ path, label, openedAt }, ...without].slice(0, MAX_RECENT);
}

function pickActiveAfterClose(activePath: string | null, openTabs: string[], closed: string): string | null {
  const remaining = openTabs.filter((p) => p !== closed);
  if (remaining.length === 0) return null;
  if (activePath !== closed) return activePath;
  const idx = openTabs.indexOf(closed);
  if (idx > 0) return openTabs[idx - 1]!;
  return remaining[0]!;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      openTabs: [],
      activePath: null,
      recentFiles: [],

      openFile: (path) => {
        set((s) => {
          const recentFiles = pushRecent(s.recentFiles, path);
          let openTabs = s.openTabs;
          if (!openTabs.includes(path)) {
            openTabs = [...openTabs, path];
          }
          return { recentFiles, openTabs, activePath: path };
        });
      },

      addRecent: (path) => {
        set((s) => ({ recentFiles: pushRecent(s.recentFiles, path) }));
      },

      setActiveTab: (path) => {
        const { openTabs } = get();
        if (!openTabs.includes(path)) return;
        set({ activePath: path });
      },

      closeTab: (path) => {
        set((s) => {
          const openTabs = s.openTabs.filter((p) => p !== path);
          const activePath = pickActiveAfterClose(s.activePath, s.openTabs, path);
          return { openTabs, activePath };
        });
      },

      leaveReader: () => set({ activePath: null }),
    }),
    {
      name: "sdf-documents",
      partialize: (s) => ({
        openTabs: s.openTabs,
        activePath: s.activePath,
        recentFiles: s.recentFiles,
      }),
    }
  )
);
