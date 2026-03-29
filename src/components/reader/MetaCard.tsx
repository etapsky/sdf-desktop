// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Mirrors sdf/apps/demo-reader MetaCard.
import type { SDFMeta } from "@etapsky/sdf-kit";

interface Props {
  meta: SDFMeta;
}

const Row = ({
  label,
  value,
  mono = false,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) => (
  <div
    className="meta-card-row"
    style={{
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      gap: "8px",
      padding: "5px 0",
      borderBottom: "1px solid var(--reader-border)",
    }}
  >
    <span
      style={{
        fontFamily: "var(--reader-sans)",
        fontSize: "11px",
        color: "var(--reader-text3)",
        fontWeight: 400,
        paddingTop: "1px",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: mono ? "var(--reader-mono)" : "var(--reader-sans)",
        fontSize: mono ? "11px" : "12px",
        color: color ?? "var(--reader-text)",
        fontWeight: 400,
        wordBreak: "break-all",
      }}
    >
      {value}
    </span>
  </div>
);

export function MetaCard({ meta }: Props) {
  const docTypeColor: Record<string, string> = {
    invoice: "var(--reader-teal)",
    nomination: "var(--reader-accent2)",
    purchase_order: "var(--reader-amber)",
    gov_tax_declaration: "var(--reader-coral)",
    gov_customs_declaration: "var(--reader-coral)",
    gov_permit_application: "var(--reader-coral)",
    gov_health_report: "var(--reader-coral)",
  };

  const typeColor = meta.document_type
    ? docTypeColor[meta.document_type] ?? "var(--reader-text2)"
    : "var(--reader-text2)";

  return (
    <div
      style={{
        background: "var(--reader-bg2)",
        border: "1px solid var(--reader-border)",
        borderRadius: "8px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--reader-mono)",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "1.5px",
            color: "var(--reader-text3)",
            textTransform: "uppercase",
          }}
        >
          meta.json
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {meta.document_type && (
            <span
              style={{
                fontFamily: "var(--reader-mono)",
                fontSize: "10px",
                color: typeColor,
                background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${typeColor} 40%, transparent)`,
                borderRadius: "4px",
                padding: "2px 8px",
              }}
            >
              {meta.document_type}
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--reader-mono)",
              fontSize: "10px",
              color: "var(--reader-accent2)",
              background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 28%, transparent)",
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            v{meta.sdf_version}
          </span>
        </div>
      </div>

      <div>
        <Row label="Document ID" value={meta.document_id} mono />
        <Row
          label="Issuer"
          value={meta.issuer + (meta.issuer_id ? ` (${meta.issuer_id})` : "")}
        />
        {meta.recipient && (
          <Row
            label="Recipient"
            value={meta.recipient + (meta.recipient_id ? ` (${meta.recipient_id})` : "")}
          />
        )}
        <Row label="Created" value={new Date(meta.created_at).toLocaleString()} />
        {meta.schema_id && <Row label="Schema" value={meta.schema_id} mono />}
        {meta.expires_at && (
          <Row label="Expires" value={new Date(meta.expires_at).toLocaleString()} color="var(--reader-amber)" />
        )}
        {meta.tags && meta.tags.length > 0 && <Row label="Tags" value={meta.tags.join(", ")} />}
        <Row
          label="Signature"
          value={meta.signature_algorithm ?? "none (Phase 4)"}
          color="var(--reader-text3)"
          mono
        />
      </div>
    </div>
  );
}
