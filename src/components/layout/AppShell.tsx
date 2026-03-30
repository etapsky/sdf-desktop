// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DocumentTabBar } from "./DocumentTabBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { DashboardView } from "@/views/Dashboard/DashboardView";
import { DocumentReaderView } from "@/views/Document/DocumentReaderView";
import { SettingsView } from "@/views/Settings/SettingsView";
import { ProducerView } from "@/views/Producer/ProducerView";
import { useSdfOpenListener } from "@/hooks/useSdfOpenListener";
import { useThemeStore } from "@/stores/themeStore";
import { useDocumentStore } from "@/stores/documentStore";

type View = "dashboard" | "documents" | "cloud" | "settings" | "new";

export function AppShell() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { resolved } = useThemeStore();

  const activePath = useDocumentStore((s) => s.activePath);
  const openTabs = useDocumentStore((s) => s.openTabs);
  const openFile = useDocumentStore((s) => s.openFile);
  const setActiveTab = useDocumentStore((s) => s.setActiveTab);
  const closeTab = useDocumentStore((s) => s.closeTab);
  const leaveReader = useDocumentStore((s) => s.leaveReader);
  const recentFiles = useDocumentStore((s) => s.recentFiles);

  const handleOpenSdfPath = useCallback(
    (filePath: string) => {
      openFile(filePath);
    },
    [openFile]
  );

  useSdfOpenListener(handleOpenSdfPath);

  const navigate = useCallback(
    (v: View) => {
      leaveReader();
      setActiveView(v);
    },
    [leaveReader]
  );

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
      case "new":
        return <ProducerView onClose={() => navigate("dashboard")} />;
      default:
        return (
          <DashboardView
            onOpenSdfFile={handleOpenSdfPath}
            onNewDocument={() => navigate("new")}
          />
        );
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
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={navigate}
        recentDocuments={recentFiles.map((r) => ({ path: r.path, label: r.label }))}
        onOpenRecentDocument={(path) => openFile(path)}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          activeView={activeView}
          collapsed={!sidebarOpen}
          onNavigate={(v) => navigate(v as View)}
        />
        <main
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--color-bg)",
          }}
        >
          {activePath ? (
            <>
              {openTabs.length > 0 && (
                <DocumentTabBar
                  tabs={openTabs}
                  activePath={activePath}
                  onSelect={setActiveTab}
                  onClose={closeTab}
                />
              )}
              <DocumentReaderView
                path={activePath}
                onClose={() => {
                  if (activePath) closeTab(activePath);
                }}
                onOpenFile={handleOpenSdfPath}
              />
            </>
          ) : (
            renderView()
          )}
        </main>
      </div>
    </div>
  );
}
