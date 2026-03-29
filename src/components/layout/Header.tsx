// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { Sidebar, SidebarOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import etapskyLogo from "@/assets/etapsky_horizonral_logo.svg";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const { resolved } = useThemeStore();
  const logoFilter = resolved === "dark" ? "brightness(0) invert(1)" : "none";

  return (
    <header
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
      {/* macOS traffic lights zone — fixed 72px */}
      <div
        data-tauri-drag-region
        style={{ width: 72, flexShrink: 0 }}
      />

      {/* Sidebar toggle */}
      <button
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
        {sidebarOpen
          ? <Sidebar style={{ width: 18, height: 18 }} />
          : <SidebarOpen style={{ width: 18, height: 18 }} />
        }
      </button>

      {/* Spacer */}
      <div data-tauri-drag-region style={{ flex: 1 }} />

      {/* Etapsky logo — far right */}
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
          flexShrink: 0,
        }}
      />
    </header>
  );
}
