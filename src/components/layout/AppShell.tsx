// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DashboardView } from "@/views/Dashboard/DashboardView";
import { SettingsView } from "@/views/Settings/SettingsView";
import { useThemeStore } from "@/stores/themeStore";

type View = "dashboard" | "documents" | "cloud" | "settings" | "new";

export function AppShell() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { resolved } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const renderView = () => {
    switch (activeView) {
      case "settings": return <SettingsView />;
      default:         return <DashboardView />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--color-bg)",
      }}
    >
      {/* ── Header: full width, spans everything ── */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Body: sidebar + main ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          activeView={activeView}
          collapsed={!sidebarOpen}
          onNavigate={(v) => setActiveView(v as View)}
        />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--color-bg)",
          }}
        >
          {renderView()}
        </main>
      </div>
    </div>
  );
}
