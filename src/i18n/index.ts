// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en-US.json";
import fr from "./locales/fr-FR.json";
import de from "./locales/de-DE.json";
import { readPersistedLocale } from "./bootstrap";

const lng = readPersistedLocale();

void i18n.use(initReactI18next).init({
  resources: {
    "en-US": { translation: en },
    "fr-FR": { translation: fr },
    "de-DE": { translation: de },
  },
  lng,
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = lng;

export default i18n;
