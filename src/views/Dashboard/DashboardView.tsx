// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Clock, CheckCircle, AlertCircle, Plus, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGreeting } from "@/lib/greeting";
import sdfIcon from "@/assets/sdf_icon.svg";

interface RecentFile {
  id: string;
  name: string;
  size: string;
  modified: string;
  status: "signed" | "unsigned" | "invalid";
}

const MOCK_RECENT: RecentFile[] = [
  { id: "1", name: "invoice-2026-001.sdf", size: "142 KB", modified: "2 min ago", status: "signed" },
  { id: "2", name: "contract-acme-corp.sdf", size: "89 KB", modified: "1 hour ago", status: "signed" },
  { id: "3", name: "purchase-order-draft.sdf", size: "56 KB", modified: "Yesterday", status: "unsigned" },
  { id: "4", name: "delivery-note-0392.sdf", size: "201 KB", modified: "2 days ago", status: "invalid" },
  { id: "5", name: "customs-declaration-TR.sdf", size: "317 KB", modified: "3 days ago", status: "signed" },
];

function StatusBadge({ status }: { status: RecentFile["status"] }) {
  if (status === "signed")
    return (
      <Badge variant="success">
        <CheckCircle className="h-2.5 w-2.5" />
        Signed
      </Badge>
    );
  if (status === "invalid")
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-2.5 w-2.5" />
        Invalid
      </Badge>
    );
  return <Badge variant="secondary">Unsigned</Badge>;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger" | "amber";
}

function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  const styles = {
    primary: {
      wrap: "border-[--color-primary]/30 bg-gradient-to-br from-[--color-primary-muted] to-transparent",
      icon: "bg-[--color-primary]/15 text-[--color-primary]",
      value: "text-[--color-primary]",
    },
    success: {
      wrap: "border-[--color-success]/30 bg-gradient-to-br from-[--color-success-muted] to-transparent",
      icon: "bg-[--color-success]/15 text-[--color-success]",
      value: "text-[--color-success]",
    },
    warning: {
      wrap: "border-[--color-warning]/30 bg-gradient-to-br from-[--color-warning-muted] to-transparent",
      icon: "bg-[--color-warning]/15 text-[--color-warning]",
      value: "text-[--color-warning]",
    },
    danger: {
      wrap: "border-[--color-danger]/30 bg-gradient-to-br from-[--color-danger-muted] to-transparent",
      icon: "bg-[--color-danger]/15 text-[--color-danger]",
      value: "text-[--color-danger]",
    },
    amber: {
      wrap: "border-[--color-amber]/30 bg-gradient-to-br from-[--color-amber-muted] to-transparent",
      icon: "bg-[--color-amber]/15 text-[--color-amber]",
      value: "text-[--color-amber]",
    },
  }[color];

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", styles.wrap)}>
      <div className="flex items-start justify-between">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", styles.icon)}>
          {icon}
        </div>
        <p className="text-[11px] text-[--color-muted] uppercase tracking-wider font-semibold">
          {label}
        </p>
      </div>
      <div>
        <p className={cn("text-3xl font-bold tracking-tight", styles.value)}>{value}</p>
        {sub && <p className="text-[11px] text-[--color-muted] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardView() {
  const { text: greetingText } = getGreeting("Yunus");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[--color-bg]">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">

          {/* ── Welcome banner ── */}
          <div className="relative rounded-xl border border-[--color-primary]/30 bg-gradient-to-r from-[--color-primary-muted] via-transparent to-transparent overflow-hidden px-6 py-5">
            <div className="flex items-center gap-4">
              <img src={sdfIcon} alt="SDF" className="h-10 w-10 rounded-xl shadow-[--shadow-sm]" />
              <div>
                <h1 className="text-lg font-bold text-[--color-fg] leading-tight">
                  {greetingText}
                </h1>
                <p className="text-sm text-[--color-muted-fg] mt-0.5">
                  You have <span className="text-[--color-amber] font-semibold">4 documents</span> awaiting action.
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" className="gap-2 shadow-[--shadow-sm]">
                  <Plus className="h-3.5 w-3.5" />
                  New Document
                </Button>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Open File
                </Button>
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value="24"
              sub="All documents"
              icon={<FileText className="h-4 w-4" />}
              color="primary"
            />
            <StatCard
              label="Signed"
              value="18"
              sub="75% of total"
              icon={<ShieldCheck className="h-4 w-4" />}
              color="success"
            />
            <StatCard
              label="Pending"
              value="4"
              sub="Awaiting signature"
              icon={<AlertTriangle className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              label="This Week"
              value="6"
              sub="+2 from last week"
              icon={<TrendingUp className="h-4 w-4" />}
              color="primary"
            />
          </div>

          {/* ── Recent files ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[--color-muted]" />
                <h2 className="text-sm font-semibold text-[--color-fg]">Recent Documents</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                View all
              </Button>
            </div>

            <div className="rounded-xl border border-[--color-border] overflow-hidden bg-[--color-surface] shadow-[--shadow-sm]">
              {MOCK_RECENT.map((file, i) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-[--color-surface-hover] transition-colors cursor-pointer group",
                    i < MOCK_RECENT.length - 1 && "border-b border-[--color-border-subtle]"
                  )}
                >
                  {/* File icon */}
                  <div className="h-9 w-9 rounded-lg bg-[--color-primary-muted] flex items-center justify-center shrink-0 border border-[--color-primary]/20">
                    <img src={sdfIcon} alt="" className="h-5 w-5" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[--color-fg] truncate">{file.name}</p>
                    <p className="text-[11px] text-[--color-muted]">
                      {file.size} · {file.modified}
                    </p>
                  </div>

                  <StatusBadge status={file.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
