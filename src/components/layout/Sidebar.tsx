// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThemeStore, type ThemeMode } from "@/stores/themeStore";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Cloud,
  Plus,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from "lucide-react";
import fennecFox from "@/assets/fennec-fox.svg";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, badge, collapsed, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{ cursor: "pointer" }}
      className={cn(
        "flex w-full items-center rounded-md transition-colors duration-100",
        collapsed ? "justify-center px-0 py-2 h-9" : "gap-2.5 px-2.5 py-1.5",
        active
          ? "bg-[var(--color-sidebar-active)] text-[var(--color-fg)] font-medium"
          : "text-[var(--color-muted-fg)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
      )}
    >
      <span className={cn("shrink-0 w-4 h-4", active && "text-[var(--color-primary)]")}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate text-sm">{label}</span>
          {badge && (
            <span
              style={{
                fontSize: 10,
                background: "var(--color-border)",
                color: "var(--color-muted)",
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: "system", icon: <Monitor className="h-3.5 w-3.5" />, label: "System" },
  { mode: "light",  icon: <Sun className="h-3.5 w-3.5" />,     label: "Light"  },
  { mode: "dark",   icon: <Moon className="h-3.5 w-3.5" />,    label: "Dark"   },
];

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { mode, setMode } = useThemeStore();

  if (collapsed) {
    const current = THEME_OPTIONS.find((o) => o.mode === mode)!;
    const next = THEME_OPTIONS[(THEME_OPTIONS.findIndex((o) => o.mode === mode) + 1) % 3];
    return (
      <button
        onClick={() => setMode(next.mode)}
        title={`Theme: ${mode}`}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 36,
          border: "none",
          background: "transparent",
          color: "var(--color-muted-fg)",
          borderRadius: 6,
          transition: "background 100ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-sidebar-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-fg)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-fg)";
        }}
      >
        {current.icon}
      </button>
    );
  }

  return (
    <div className="px-2.5 py-1.5 flex items-center justify-between">
      <span style={{ fontSize: 12, color: "var(--color-muted-fg)" }}>Appearance</span>
      <div
        style={{
          display: "flex",
          gap: 2,
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          padding: 2,
        }}
      >
        {THEME_OPTIONS.map(({ mode: m, icon, label }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            title={label}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 4,
              border: "none",
              background: mode === m ? "var(--color-primary)" : "transparent",
              color: mode === m ? "var(--color-primary-fg)" : "var(--color-muted)",
              transition: "all 120ms ease",
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  activeView?: string;
  collapsed?: boolean;
  onNavigate?: (view: string) => void;
}

export function Sidebar({ activeView = "dashboard", collapsed = false, onNavigate }: SidebarProps) {
  const nav = (view: string) => () => onNavigate?.(view);

  return (
    <aside
      style={{
        width: collapsed ? 52 : 224,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: "1px solid var(--color-sidebar-border)",
        background: "var(--color-sidebar)",
        overflow: "hidden",
        transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* ── Quick action ── */}
      <div style={{ padding: collapsed ? "10px 6px" : "10px 8px", flexShrink: 0 }}>
        {collapsed ? (
          <button
            onClick={nav("new")}
            title="New Document"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 32,
              borderRadius: 6,
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-primary-fg)",
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
          </button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="w-full justify-start gap-2"
            style={{ fontSize: 13 }}
            onClick={nav("new")}
          >
            <Plus className="h-3.5 w-3.5" />
            New Document
          </Button>
        )}
      </div>

      <div style={{ height: 1, background: "var(--color-sidebar-border)" }} />

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 6px" : "8px" }}>
        {!collapsed && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "2px 10px 6px",
              whiteSpace: "nowrap",
            }}
          >
            Workspace
          </p>
        )}
        <NavItem
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Dashboard"
          active={activeView === "dashboard"}
          collapsed={collapsed}
          onClick={nav("dashboard")}
        />
        <NavItem
          icon={<FileText className="h-4 w-4" />}
          label="Documents"
          active={activeView === "documents"}
          collapsed={collapsed}
          onClick={nav("documents")}
        />
        <NavItem
          icon={<Cloud className="h-4 w-4" />}
          label="Cloud Sync"
          active={activeView === "cloud"}
          badge={collapsed ? undefined : "Soon"}
          collapsed={collapsed}
          onClick={nav("cloud")}
        />
      </nav>

      <div style={{ height: 1, background: "var(--color-sidebar-border)" }} />

      {/* ── Bottom ── */}
      <div style={{ padding: collapsed ? "8px 6px" : "8px", flexShrink: 0 }}>
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          active={activeView === "settings"}
          collapsed={collapsed}
          onClick={nav("settings")}
        />
        <ThemeToggle collapsed={collapsed} />
      </div>

      <div style={{ height: 1, background: "var(--color-sidebar-border)" }} />

      {/* ── User pill ── */}
      <div style={{ padding: collapsed ? "8px 6px 10px" : "8px 8px 10px" }}>
        <button
          title={collapsed ? "Yunus YILDIZ" : undefined}
          style={{
            cursor: "pointer",
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            borderRadius: 6,
            padding: collapsed ? "6px 0" : "7px 10px",
            border: "none",
            background: "transparent",
            transition: "background 100ms ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-sidebar-hover)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--color-primary-muted)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              outline: "1px solid var(--color-border)",
            }}
          >
            <img
              src={fennecFox}
              alt="avatar"
              style={{ width: 22, height: 22, objectFit: "contain" }}
            />
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }}
                >
                  Yunus YILDIZ
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--color-muted)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }}
                >
                  Etapsky Inc.
                </p>
              </div>
              <ChevronDown
                style={{ width: 12, height: 12, color: "var(--color-muted)", flexShrink: 0 }}
              />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
