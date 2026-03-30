// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { Loader2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings } from "lucide-react";
import etapskyLogo from "@/assets/etapsky_horizonral_logo.svg";
import { useLocaleStore, APP_LOCALES, type AppLocale } from "@/stores/localeStore";
import { localeToTranslationKey } from "@/i18n/localeLabel";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { SettingsBillingSection } from "@/views/Settings/SettingsBillingSection";
import { useUpdater } from "@/components/updater/UpdaterProvider";
import { Button } from "@/components/ui/button";

const DOCS_URL = "https://docs.etapsky.com";

async function openDocsInBrowser() {
  try {
    await openUrl(DOCS_URL);
  } catch {
    window.open(DOCS_URL, "_blank", "noopener,noreferrer");
  }
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 py-3">
      <div className="min-w-0">
        <p className="text-sm text-[--color-fg]">{label}</p>
        {description && (
          <p className="text-xs text-[--color-muted] mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold text-[--color-muted] uppercase tracking-wider mb-2">
        {title}
      </h2>
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border-subtle] px-4 shadow-[--shadow-sm]">
        {children}
      </div>
    </div>
  );
}

export function SettingsView() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();
  const { user, logout, isAuthenticated } = useAuth();
  const { checkForUpdatesManual, checkingManual } = useUpdater();
  const [appVersion, setAppVersion] = useState<string>("…");

  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion("—"));
  }, []);
  const apiHost = (() => {
    try {
      return new URL((import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "https://api.etapsky.com").host;
    } catch {
      return "api.etapsky.com";
    }
  })();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[--color-bg]">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[--color-primary-muted] flex items-center justify-center">
              <Settings className="h-4 w-4 text-[--color-primary]" />
            </div>
            <h1 className="text-xl font-bold text-[--color-fg]">{t("settings.title")}</h1>
          </div>

          <Section title={t("settings.language")}>
            <SettingRow
              label={t("settings.displayLanguage")}
              description={t("settings.languageDescription")}
            >
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as AppLocale)}
                className={cn(
                  "text-sm rounded-lg border border-[--color-border] bg-[--color-bg] text-[--color-fg]",
                  "px-3 py-2 min-w-[220px] cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-1 focus-visible:ring-offset-[--color-bg]"
                )}
              >
                {APP_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {t(localeToTranslationKey(loc))}
                  </option>
                ))}
              </select>
            </SettingRow>
          </Section>

          <Section title={t("settings.account")}>
            <SettingRow
              label={t("settings.signedInAs")}
              description={user?.tenantId || t("settings.signedInOrg")}
            >
              <span className="text-sm text-[--color-muted]">
                {user?.email || "—"}
              </span>
            </SettingRow>
            <SettingRow label={t("settings.apiServer")}>
              <span className="text-xs font-mono text-[--color-muted]">{apiHost}</span>
            </SettingRow>
            <SettingRow label={t("auth.session")}>
              <Badge variant={isAuthenticated ? "success" : "secondary"}>
                {isAuthenticated ? t("auth.signedIn") : t("auth.signedOut")}
              </Badge>
            </SettingRow>
            {isAuthenticated && (
              <SettingRow label={t("auth.signOut")}>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-xs text-[--color-danger] hover:underline cursor-pointer"
                >
                  {t("auth.signOut")}
                </button>
              </SettingRow>
            )}
          </Section>

          {isAuthenticated && (
            <div className="pt-1">
              <SettingsBillingSection />
            </div>
          )}

          <Section title={t("settings.application")}>
            <SettingRow label={t("settings.autoUpdate")} description={t("settings.autoUpdateDesc")}>
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <Badge variant="success">{t("settings.enabled")}</Badge>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={checkingManual}
                  onClick={() => void checkForUpdatesManual()}
                >
                  {checkingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  {checkingManual ? t("updater.checking") : t("updater.checkNow")}
                </Button>
              </div>
            </SettingRow>
            <SettingRow
              label={t("settings.fileAssociation")}
              description={t("settings.fileAssociationDesc")}
            >
              <Badge variant="success">{t("settings.registered")}</Badge>
            </SettingRow>
          </Section>

          <Section title={t("settings.about")}>
            <SettingRow label={t("settings.version")}>
              <Badge variant="secondary" className="font-mono text-xs">
                {appVersion}
              </Badge>
            </SettingRow>
            <SettingRow label={t("settings.sdfFormat")}>
              <span className="text-sm text-[--color-muted]">Spec v1.0</span>
            </SettingRow>
            <SettingRow label={t("settings.license")}>
              <Badge variant="amber">BUSL-1.1</Badge>
            </SettingRow>
            <SettingRow label={t("settings.documentation")}>
              <button
                type="button"
                onClick={() => void openDocsInBrowser()}
                className="flex items-center gap-1 text-xs text-[--color-primary] hover:underline cursor-pointer"
              >
                docs.etapsky.com
                <ExternalLink className="h-3 w-3" />
              </button>
            </SettingRow>
          </Section>

          <div className="flex items-center justify-center pt-4 pb-2">
            <img src={etapskyLogo} alt="Etapsky" className="h-5 opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}
