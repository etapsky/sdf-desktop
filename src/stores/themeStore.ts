// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
}

interface ThemeStore {
  mode: ThemeMode;          // what user chose: system | light | dark
  resolved: ResolvedTheme;  // actual applied theme
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;        // system → light → dark → system
  _syncSystem: () => void;  // called by OS change listener
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "system",
      resolved: getSystemTheme(),

      setMode: (mode) => {
        const resolved = mode === "system" ? getSystemTheme() : mode;
        applyTheme(resolved);
        set({ mode, resolved });
      },

      cycle: () => {
        const order: ThemeMode[] = ["system", "light", "dark"];
        const current = get().mode;
        const next = order[(order.indexOf(current) + 1) % order.length];
        get().setMode(next);
      },

      _syncSystem: () => {
        if (get().mode === "system") {
          const resolved = getSystemTheme();
          applyTheme(resolved);
          set({ resolved });
        }
      },
    }),
    {
      name: "sdf-theme",
      partialize: (s) => ({ mode: s.mode }), // only persist mode, not resolved
    }
  )
);

// ── Boot: apply before first paint ─────────────────────────────────────────
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem("sdf-theme") || "{}")?.mode as ThemeMode;
  } catch { return undefined; }
})();

const bootMode: ThemeMode = saved ?? "system";
const bootResolved: ResolvedTheme = bootMode === "system" ? getSystemTheme() : bootMode;
applyTheme(bootResolved);

// ── OS theme change listener ────────────────────────────────────────────────
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    useThemeStore.getState()._syncSystem();
  });
