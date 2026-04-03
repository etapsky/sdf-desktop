// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// SignatureDetailPanel — shows full signature info inside the Reader side panel.
// Renders in the "signature" tab when a signed SDF is open.

import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  FileDigit,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
} from "lucide-react";
import type { SignatureValidation } from "@/lib/tauri/validator";

interface Props {
  validation: SignatureValidation;
}

export function SignatureDetailPanel({ validation }: Props) {
  const { t } = useTranslation();
  const { status, signer_info, signed_at, algorithm, content_digest, tsa_verified, cert_expired } = validation;

  const isValid   = status === "valid";
  const isInvalid = status === "invalid";
  const isUnsigned = status === "unsigned";

  return (
    <div
      style={{
        background: "var(--reader-bg2)",
        border:     "1px solid var(--reader-border)",
        borderRadius: 8,
        padding:    "14px 16px",
        display:    "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* ── Header badge ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isUnsigned  && <ShieldQuestion style={{ width: 16, height: 16, color: "var(--reader-text3)" }} />}
        {isValid     && !cert_expired && <ShieldCheck style={{ width: 16, height: 16, color: "var(--reader-teal)" }} />}
        {isValid     && cert_expired  && <ShieldAlert style={{ width: 16, height: 16, color: "var(--color-amber)" }} />}
        {isInvalid   && <ShieldOff style={{ width: 16, height: 16, color: "var(--reader-coral)" }} />}
        <span style={{
          fontFamily: "var(--reader-mono)",
          fontSize: 11,
          fontWeight: 600,
          color: isUnsigned ? "var(--reader-text3)"
            : isValid && !cert_expired ? "var(--reader-teal)"
            : isValid && cert_expired  ? "var(--color-amber)"
            : "var(--reader-coral)",
        }}>
          {isUnsigned  ? t("sign.panel.unsigned")
           : isValid   ? (cert_expired ? t("sign.panel.validExpiredCert") : t("sign.panel.valid"))
           : t("sign.panel.invalid")}
        </span>
        {validation.reason && (
          <span style={{ fontFamily: "var(--reader-mono)", fontSize: 10, color: "var(--reader-text3)" }}>
            ({validation.reason})
          </span>
        )}
      </div>

      {isUnsigned && (
        <p style={{ fontFamily: "var(--reader-sans)", fontSize: 12, color: "var(--reader-text3)", margin: 0 }}>
          {t("sign.panel.unsignedDesc")}
        </p>
      )}

      {/* ── Signer identity ───────────────────────────────────────────────── */}
      {signer_info && (
        <section>
          <SectionLabel label={t("sign.panel.signerSection")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <InfoRow
              icon={<Info style={{ width: 11, height: 11 }} />}
              label={t("sign.panel.mode")}
              value={signer_info.mode === "x509" ? "X.509 Certificate" : "Self-signed Key"}
              mono
            />
            {signer_info.subject?.common_name && (
              <InfoRow label={t("sign.panel.name")} value={signer_info.subject.common_name} />
            )}
            {signer_info.subject?.organization && (
              <InfoRow label={t("sign.panel.org")} value={signer_info.subject.organization} />
            )}
            {signer_info.subject?.email && (
              <InfoRow label={t("sign.panel.email")} value={signer_info.subject.email} />
            )}
            {signer_info.issuer_name && signer_info.issuer_name !== "Unknown" && (
              <InfoRow label={t("sign.panel.issuer")} value={signer_info.issuer_name} />
            )}
            {signer_info.cert_fingerprint_sha256 && (
              <InfoRow
                label={t("sign.panel.fingerprint")}
                value={`${signer_info.cert_fingerprint_sha256.slice(0, 8)}…${signer_info.cert_fingerprint_sha256.slice(-8)}`}
                mono
              />
            )}
            {signer_info.not_after && (
              <InfoRow
                label={t("sign.panel.certExpiry")}
                value={new Date(signer_info.not_after).toLocaleDateString()}
                color={cert_expired ? "var(--reader-coral)" : undefined}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Signing time ──────────────────────────────────────────────────── */}
      {signed_at && (
        <section>
          <SectionLabel label={t("sign.panel.timestampSection")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <InfoRow
              icon={<Clock style={{ width: 11, height: 11 }} />}
              label={t("sign.panel.signedAt")}
              value={new Date(signed_at).toLocaleString()}
            />
            {signer_info?.tsa_signed_at && (
              <InfoRow
                icon={<CheckCircle2 style={{ width: 11, height: 11, color: "var(--reader-teal)" }} />}
                label={t("sign.panel.tsaSignedAt")}
                value={new Date(signer_info.tsa_signed_at).toLocaleString()}
                color="var(--reader-teal)"
              />
            )}
            {tsa_verified && !signer_info?.tsa_signed_at && (
              <InfoRow
                label={t("sign.panel.tsaToken")}
                value={t("sign.panel.tsaPresent")}
                color="var(--reader-teal)"
              />
            )}
          </div>
        </section>
      )}

      {/* ── Cryptographic details ─────────────────────────────────────────── */}
      {(algorithm || content_digest) && (
        <section>
          <SectionLabel label={t("sign.panel.cryptoSection")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {algorithm && (
              <InfoRow
                icon={<FileDigit style={{ width: 11, height: 11 }} />}
                label={t("sign.panel.algorithm")}
                value={algorithm}
                mono
              />
            )}
            {content_digest && (
              <InfoRow
                label={t("sign.panel.digest")}
                value={`${content_digest.slice(0, 16)}…`}
                mono
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: "var(--reader-mono)",
      fontSize: "10px",
      fontWeight: 500,
      letterSpacing: "1.2px",
      color: "var(--reader-text3)",
      textTransform: "uppercase",
      marginBottom: 6,
    }}>
      {label}
    </div>
  );
}

interface RowProps {
  icon?:  React.ReactNode;
  label:  string;
  value:  string;
  mono?:  boolean;
  color?: string;
}

function InfoRow({ icon, label, value, mono, color }: RowProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr",
      gap: 6,
      padding: "3px 0",
      borderBottom: "1px solid var(--reader-border)",
      alignItems: "center",
    }}>
      <span style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--reader-sans)",
        fontSize: 11,
        color: "var(--reader-text3)",
      }}>
        {icon}
        {label}
      </span>
      <span style={{
        fontFamily: mono ? "var(--reader-mono)" : "var(--reader-sans)",
        fontSize: mono ? 10 : 11,
        color: color ?? "var(--reader-text)",
        wordBreak: "break-all",
      }}>
        {value}
      </span>
    </div>
  );
}
