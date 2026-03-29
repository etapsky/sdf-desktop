// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { DashboardView } from "@/views/Dashboard/DashboardView";
import { DocumentReaderView } from "@/views/Document/DocumentReaderView";
import { SettingsView } from "@/views/Settings/SettingsView";
import { useSdfOpenListener } from "@/hooks/useSdfOpenListener";
import { useThemeStore } from "@/stores/themeStore";

type View = "dashboard" | "documents" | "cloud" | "settings" | "new";

export function AppShell() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [openDocumentPath, setOpenDocumentPath] = useState<string | null>(null);
  const { resolved } = useThemeStore();

  const handleOpenSdfPath = useCallback((filePath: string) => {
    setOpenDocumentPath(filePath);
    setActiveView("dashboard");
  }, []);

  useSdfOpenListener(handleOpenSdfPath);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView onOpenSdfFile={handleOpenSdfPath} />;
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
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setActiveView}
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
          {openDocumentPath ? (
            <DocumentReaderView
              path={openDocumentPath}
              onClose={() => setOpenDocumentPath(null)}
            />
          ) : (
            renderView()
          )}
        </main>
      </div>
    </div>
  );
}
