// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Cloud, FileText, LayoutDashboard, Plus, Search, Settings, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export type CommandNavigateView = "dashboard" | "documents" | "cloud" | "settings" | "new";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: CommandNavigateView) => void;
  recentDocuments?: { path: string; label: string }[];
  onOpenRecentDocument?: (path: string) => void;
}

function runThen(
  onOpenChange: (open: boolean) => void,
  action: () => void
) {
  onOpenChange(false);
  queueMicrotask(action);
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  recentDocuments = [],
  onOpenRecentDocument,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const { cycle } = useThemeStore();

  const go = useCallback(
    (view: CommandNavigateView) => {
      runThen(onOpenChange, () => onNavigate(view));
    },
    [onNavigate, onOpenChange]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("commandPalette.title")}
      overlayClassName="command-dialog-overlay"
      contentClassName="command-dialog-content"
      shouldFilter
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted]"
          aria-hidden
        />
        <CommandInput
          placeholder={t("commandPalette.inputPlaceholder")}
          className="command-palette-input"
        />
      </div>
      <CommandList className="command-palette-list">
        <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>

        <CommandGroup heading={t("commandPalette.navigation")}>
          <CommandItem
            value="nav-dashboard"
            keywords={["dashboard", "home", "overview", t("nav.dashboard")]}
            onSelect={() => go("dashboard")}
          >
            <LayoutDashboard className="shrink-0 opacity-80" />
            <span>{t("nav.dashboard")}</span>
          </CommandItem>
          <CommandItem
            value="nav-documents"
            keywords={["documents", "files", "sdf", t("nav.documents")]}
            onSelect={() => go("documents")}
          >
            <FileText className="shrink-0 opacity-80" />
            <span>{t("nav.documents")}</span>
          </CommandItem>
          <CommandItem
            value="nav-cloud"
            keywords={["cloud", "sync", t("nav.cloudSync")]}
            onSelect={() => go("cloud")}
          >
            <Cloud className="shrink-0 opacity-80" />
            <span>{t("nav.cloudSync")}</span>
          </CommandItem>
          <CommandItem
            value="nav-settings"
            keywords={["settings", "preferences", "language", t("nav.settings"), t("settings.title")]}
            onSelect={() => go("settings")}
          >
            <Settings className="shrink-0 opacity-80" />
            <span>{t("commandPalette.goSettings")}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="command-palette-sep" />

        <CommandGroup heading={t("commandPalette.actions")}>
          <CommandItem
            value="action-new-doc"
            keywords={["new", "create", "sdf", t("nav.newDocument")]}
            onSelect={() => go("new")}
          >
            <Plus className="shrink-0 opacity-80" />
            <span>{t("nav.newDocument")}</span>
          </CommandItem>
          <CommandItem
            value="action-theme-cycle"
            keywords={["theme", "dark", "light", "system", "appearance", t("theme.appearance")]}
            onSelect={() => runThen(onOpenChange, () => cycle())}
          >
            <Sun className="shrink-0 opacity-80" />
            <span>{t("commandPalette.toggleTheme")}</span>
          </CommandItem>
        </CommandGroup>

        {recentDocuments.length > 0 && (
          <>
            <CommandSeparator className="command-palette-sep" />

            <CommandGroup heading={t("commandPalette.documents")}>
              {recentDocuments.map((doc) => (
                <CommandItem
                  key={doc.path}
                  value={`doc-${doc.path}`}
                  keywords={[
                    "sdf",
                    "pdf",
                    doc.label,
                    ...doc.label.replace(/\.(sdf|pdf)$/i, "").split(/[-_.]/gi).filter(Boolean),
                  ]}
                  className="command-palette-doc-item"
                  onSelect={() =>
                    runThen(onOpenChange, () => {
                      onOpenRecentDocument?.(doc.path);
                    })
                  }
                >
                  <FileText className="shrink-0 opacity-80" />
                  <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[--color-muted] shrink-0 tabular-nums">
                    {t("commandPalette.openDocument")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
