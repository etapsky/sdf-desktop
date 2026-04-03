// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// CertPickerStep — certificate selection UI inside SignSdfDialog.
// Shows the list of OS-stored signing certificates (macOS Keychain / Windows CertStore)
// and lets the user choose one. An "auto" option signs with the keychain self-signed key.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSigningCertificates, type CertInfo } from "@/lib/tauri/sign";

interface Props {
  selected:      string | null;   // fingerprint or "self_signed"
  onChange:      (fingerprint: string) => void;
  onCertChange?: (cert: CertInfo | null) => void;
  disabled?:     boolean;
}

export function CertPickerStep({ selected, onChange, onCertChange, disabled }: Props) {
  const { t } = useTranslation();
  const [certs, setCerts]     = useState<CertInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSigningCertificates();
      setCerts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[--color-muted]">
          {t("sign.certPickerTitle")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || disabled}
          onClick={load}
          className="h-6 gap-1 px-2 text-[11px] text-[--color-muted]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {t("sign.certPickerRefresh")}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[color-mix(in_oklch,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklch,var(--color-danger)_10%,var(--color-surface))] p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[--color-danger]" />
          <span className="text-xs text-[--color-danger]">{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-[--color-muted]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">{t("sign.certPickerLoading")}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-1.5">
          {/* Self-signed option — always shown */}
          <CertRow
            fingerprint="self_signed"
            label={t("sign.selfSignedLabel")}
            sublabel={t("sign.selfSignedSublabel")}
            isExpired={false}
            isSelfSigned={true}
            isSelected={selected === "self_signed"}
            onSelect={(fp) => { onChange(fp); onCertChange?.(null); }}
            disabled={disabled}
          />

          {/* OS certificate list */}
          {certs.length === 0 && (
            <p className="py-2 text-center text-xs text-[--color-muted]">
              {t("sign.certPickerEmpty")}
            </p>
          )}
          {certs.map((cert) => (
            <CertRow
              key={cert.fingerprint_sha256}
              fingerprint={cert.fingerprint_sha256}
              label={cert.common_name ?? cert.fingerprint_sha256.slice(0, 16) + "…"}
              sublabel={formatCertSublabel(cert)}
              isExpired={cert.is_expired}
              isSelfSigned={cert.is_self_signed}
              isSelected={selected === cert.fingerprint_sha256}
              onSelect={(fp) => { onChange(fp); onCertChange?.(cert); }}
              disabled={disabled || cert.is_expired}
              certInfo={cert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CertRow ──────────────────────────────────────────────────────────────────

interface RowProps {
  fingerprint: string;
  label:       string;
  sublabel:    string;
  isExpired:   boolean;
  isSelfSigned:boolean;
  isSelected:  boolean;
  onSelect:    (fp: string) => void;
  disabled?:   boolean;
  certInfo?:   CertInfo;
}

function CertRow({
  fingerprint, label, sublabel, isExpired, isSelfSigned,
  isSelected, onSelect, disabled, certInfo,
}: RowProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(fingerprint)}
      className={`
        group flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left
        transition-[border-color,background-color] focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[--color-primary]
        ${isSelected
          ? "border-[--color-primary] bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-surface))]"
          : "border-[--color-border-subtle] bg-[--color-surface] hover:border-[--color-border] hover:bg-[--color-surface-elevated]"
        }
        ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}
      `}
      aria-pressed={isSelected}
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0">
        {isSelected
          ? <CheckCircle2 className="h-4 w-4 text-[--color-primary]" />
          : isExpired
            ? <ShieldOff className="h-4 w-4 text-[--color-danger]" />
            : <ShieldCheck className={`h-4 w-4 ${isSelfSigned ? "text-[--color-muted]" : "text-[--color-success]"}`} />
        }
      </span>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-[--color-fg]">{label}</span>
          {isExpired && (
            <Badge variant="destructive" className="h-4 text-[9px]">{t("sign.certExpired")}</Badge>
          )}
          {!isExpired && !isSelfSigned && certInfo && (
            <Badge variant="success" className="h-4 text-[9px]">{certInfo.key_algorithm}</Badge>
          )}
          {isSelfSigned && fingerprint !== "self_signed" && (
            <Badge variant="secondary" className="h-4 text-[9px]">{t("sign.certSelfSigned")}</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] text-[--color-muted]">{sublabel}</p>

        {/* Certificate details for OS certs */}
        {certInfo && (
          <p className="mt-0.5 font-mono text-[9px] text-[--color-muted] opacity-60">
            {certInfo.fingerprint_sha256.slice(0, 8)}…{certInfo.fingerprint_sha256.slice(-8)}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCertSublabel(cert: CertInfo): string {
  const parts: string[] = [];
  if (cert.organization) parts.push(cert.organization);
  if (cert.email) parts.push(cert.email);
  if (!cert.is_expired && cert.not_after) {
    const d = new Date(cert.not_after);
    if (!isNaN(d.getTime())) {
      parts.push(`expires ${d.toLocaleDateString()}`);
    }
  }
  return parts.join(" · ") || cert.issuer;
}
