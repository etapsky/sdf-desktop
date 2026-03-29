// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings } from "lucide-react";
import etapskyLogo from "@/assets/etapsky_horizonral_logo.svg";

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
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[--color-bg]">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto space-y-6">

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[--color-primary-muted] flex items-center justify-center">
              <Settings className="h-4 w-4 text-[--color-primary]" />
            </div>
            <h1 className="text-xl font-bold text-[--color-fg]">Settings</h1>
          </div>

          <Section title="Account">
            <SettingRow label="Signed in as" description="Etapsky Inc.">
              <span className="text-sm text-[--color-muted]">yunus@etapsky.com</span>
            </SettingRow>
            <SettingRow label="API Server">
              <span className="text-xs font-mono text-[--color-muted]">api.etapsky.com</span>
            </SettingRow>
          </Section>

          <Section title="Application">
            <SettingRow label="Auto-update" description="Check for updates on launch">
              <Badge variant="success">Enabled</Badge>
            </SettingRow>
            <SettingRow label="File Association" description="Open .sdf files with this app">
              <Badge variant="success">Registered</Badge>
            </SettingRow>
          </Section>

          <Section title="About">
            <SettingRow label="Version">
              <Badge variant="secondary">0.1.0</Badge>
            </SettingRow>
            <SettingRow label="SDF Format">
              <span className="text-sm text-[--color-muted]">Spec v1.0</span>
            </SettingRow>
            <SettingRow label="License">
              <Badge variant="amber">BUSL-1.1</Badge>
            </SettingRow>
            <SettingRow label="Documentation">
              <button className="flex items-center gap-1 text-xs text-[--color-primary] hover:underline cursor-pointer">
                docs.etapsky.com
                <ExternalLink className="h-3 w-3" />
              </button>
            </SettingRow>
          </Section>

          {/* Etapsky branding */}
          <div className="flex items-center justify-center pt-4 pb-2">
            <img src={etapskyLogo} alt="Etapsky" className="h-5 opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}
