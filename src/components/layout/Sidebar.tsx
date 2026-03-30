// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useThemeStore, type ThemeMode } from "@/stores/themeStore";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Cloud,
  Loader2,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from "lucide-react";
import fennecFox from "@/assets/fennec-fox.svg";
import { useAuth } from "@/hooks/useAuth";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  /** Optional status (e.g. sync); supports string or nodes (spinner + label). */
  badge?: React.ReactNode;
  /** Collapsed strip: override native tooltip (e.g. include “Syncing”). */
  collapsedTitle?: string;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, badge, collapsedTitle, collapsed, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? (collapsedTitle ?? label) : undefined}
      style={{ cursor: "pointer" }}
      className={cn(
        "relative flex w-full items-center overflow-visible rounded-md transition-colors duration-100",
        collapsed ? "justify-center px-0 py-2 h-9" : "gap-2.5 px-2.5 py-1.5",
        active
          ? "bg-[var(--color-sidebar-active)] text-[var(--color-fg)] font-medium"
          : "text-[var(--color-muted-fg)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-fg)]"
      )}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[var(--color-primary)]"
        />
      )}
      <span className={cn("shrink-0 w-4 h-4", active && "text-[var(--color-primary)]")}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate text-sm">{label}</span>
          {badge != null && (
            <span className="inline-flex max-w-[min(100px,40%)] shrink-0 items-center gap-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--color-fg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

const THEME_ICON: Record<ThemeMode, React.ReactNode> = {
  system: <Monitor className="h-3.5 w-3.5" />,
  light: <Sun className="h-3.5 w-3.5" />,
  dark: <Moon className="h-3.5 w-3.5" />,
};

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { mode, cycle } = useThemeStore();
  const i = THEME_MODES.indexOf(mode);
  const nextMode = THEME_MODES[(i + 1) % THEME_MODES.length];
  const label = t(`theme.${mode}`);
  const nextLabel = t(`theme.${nextMode}`);

  return (
    <div
      className={cn(
        collapsed ? "flex justify-center px-1.5 py-1" : "flex flex-col gap-2 px-2.5 py-2"
      )}
    >
      {!collapsed && <span className="text-xs text-[--color-muted-fg]">{t("theme.appearance")}</span>}
      <button
        type="button"
        onClick={() => cycle()}
        title={t("theme.tooltip", { current: label, next: nextLabel })}
        className={cn(
          "flex cursor-pointer items-center text-[--color-fg] transition-colors duration-150 active:scale-[0.97]",
          collapsed
            ? "mx-auto size-9 shrink-0 justify-center rounded-md border border-[--color-border-subtle] bg-[--color-surface-elevated]/80 text-[--color-muted-fg] hover:border-[--color-border] hover:bg-[--color-sidebar-hover] hover:text-[--color-fg]"
            : "w-full justify-center gap-2 rounded-lg border border-[--color-border] bg-[--color-surface-elevated] px-3 py-2.5 hover:bg-[--color-sidebar-hover]"
        )}
      >
        <span key={mode} className="inline-flex shrink-0 theme-toggle-icon">
          {THEME_ICON[mode]}
        </span>
        {!collapsed && <span className="text-xs font-medium">{label}</span>}
      </button>
    </div>
  );
}

interface SidebarProps {
  activeView?: string;
  collapsed?: boolean;
  /** True while cloud list/usage queries or mutations are in flight. */
  cloudSyncing?: boolean;
  onNavigate?: (view: string) => void;
}

export function Sidebar({
  activeView = "dashboard",
  collapsed = false,
  cloudSyncing = false,
  onNavigate,
}: SidebarProps) {
  const { t } = useTranslation();
  const { resolved } = useThemeStore();
  const { user } = useAuth();
  const avatarImgFilter = resolved === "dark" ? "brightness(0) invert(1)" : "none";
  const nav = (view: string) => () => onNavigate?.(view);

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const displayOrg = user?.tenantId || "—";

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
      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "10px 6px 8px" : "10px 8px 8px" }}>
        <NavItem
          icon={<LayoutDashboard className="h-4 w-4" />}
          label={t("nav.dashboard")}
          active={activeView === "dashboard"}
          collapsed={collapsed}
          onClick={nav("dashboard")}
        />
        <NavItem
          icon={<FileText className="h-4 w-4" />}
          label={t("nav.documents")}
          active={activeView === "documents"}
          collapsed={collapsed}
          onClick={nav("documents")}
        />
        <NavItem
          icon={
            <span className="relative inline-flex">
              <Cloud className="h-4 w-4" />
              {cloudSyncing && collapsed && (
                <Loader2
                  className="absolute -right-1 -top-0.5 h-2.5 w-2.5 text-[var(--color-primary)] animate-spin"
                  aria-hidden
                />
              )}
            </span>
          }
          label={t("nav.cloudSync")}
          active={activeView === "cloud"}
          collapsedTitle={
            cloudSyncing ? `${t("nav.cloudSync")} — ${t("nav.syncing")}` : undefined
          }
          badge={
            cloudSyncing && !collapsed ? (
              <>
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-primary)]" aria-hidden />
                <span className="text-[var(--color-muted-fg)]">{t("nav.syncing")}</span>
              </>
            ) : undefined
          }
          collapsed={collapsed}
          onClick={nav("cloud")}
        />
      </nav>

      <div style={{ height: 1, background: "var(--color-sidebar-border)" }} />

      {/* ── Bottom ── */}
      <div style={{ padding: collapsed ? "8px 6px" : "8px", flexShrink: 0 }}>
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label={t("nav.settings")}
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
          type="button"
          title={collapsed ? `${displayName} — ${t("nav.openAccountSettings")}` : t("nav.openAccountSettings")}
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
          onClick={nav("settings")}
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
              style={{
                width: 22,
                height: 22,
                objectFit: "contain",
                filter: avatarImgFilter,
              }}
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
                  {displayName}
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
                  {displayOrg}
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
