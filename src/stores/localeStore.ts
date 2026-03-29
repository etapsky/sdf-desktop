// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/i18n";
import { readPersistedLocale, type AppLocale } from "@/i18n/bootstrap";

export type { AppLocale };

export const APP_LOCALES: AppLocale[] = ["en-US", "fr-FR", "de-DE"];

interface LocaleStore {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: readPersistedLocale(),

      setLocale: (locale) => {
        void i18n.changeLanguage(locale);
        document.documentElement.lang = locale;
        set({ locale });
      },
    }),
    {
      name: "sdf-locale",
      partialize: (s) => ({ locale: s.locale }),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) {
          void i18n.changeLanguage(state.locale);
          document.documentElement.lang = state.locale;
        }
      },
    }
  )
);
