// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Search, Sidebar, SidebarOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import etapskyLogo from "@/assets/etapsky_horizonral_logo.svg";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

function keyboardShortcutLabel(): string {
  if (typeof navigator === "undefined") return "⌘K";
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl+K";
}

export function Header({ sidebarOpen, onToggleSidebar, onOpenCommandPalette }: HeaderProps) {
  const { t } = useTranslation();
  const { resolved } = useThemeStore();
  const logoFilter = resolved === "dark" ? "brightness(0) invert(1)" : "none";
  const headerRef = useRef<HTMLElement>(null);

  /** WebKit often ignores drag on nested flex children; API drag matches native apps. */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("button, a, input, textarea, select, [contenteditable=true]")) return;
      void getCurrentWindow().startDragging().catch(() => {
        /* dev in browser without Tauri */
      });
    };

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <header
      ref={headerRef}
      data-tauri-drag-region
      style={{
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border-subtle)",
        background: "var(--color-sidebar)",
        gap: 8,
        padding: "0 12px 0 0",
      }}
    >
      <div data-tauri-drag-region style={{ width: 72, flexShrink: 0 }} />

      <button
        type="button"
        onClick={onToggleSidebar}
        title={sidebarOpen ? t("header.hideSidebar") : t("header.showSidebar")}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          border: "none",
          background: "transparent",
          color: "var(--color-muted-fg)",
          flexShrink: 0,
          padding: 0,
        }}
      >
        {sidebarOpen ? (
          <Sidebar style={{ width: 18, height: 18 }} />
        ) : (
          <SidebarOpen style={{ width: 18, height: 18 }} />
        )}
      </button>

      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center justify-center px-2"
      >
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={`${t("header.searchShortcut")} (${keyboardShortcutLabel()})`}
          className="flex h-8 w-full max-w-[340px] items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-surface-elevated] px-2.5 text-left text-[13px] text-[--color-muted-fg] transition-colors hover:bg-[--color-sidebar-hover] hover:text-[--color-fg]"
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{t("header.searchPlaceholder")}</span>
          <kbd className="pointer-events-none hidden shrink-0 rounded border border-[--color-border-subtle] bg-[--color-bg] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[--color-muted] sm:inline-block">
            {keyboardShortcutLabel()}
          </kbd>
        </button>
      </div>

      <div data-tauri-drag-region className="flex shrink-0 items-center">
        <img
          src={etapskyLogo}
          alt="Etapsky"
          style={{
            height: 20,
            width: "auto",
            maxWidth: 200,
            opacity: 0.88,
            filter: logoFilter,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>
    </header>
  );
}
