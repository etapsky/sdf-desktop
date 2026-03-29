// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Mirrors sdf/apps/demo-reader RawPanel.
export function ReaderRawPanel({ data, label }: { data: Record<string, unknown>; label: string }) {
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
          fontFamily: "var(--reader-mono)",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "1.5px",
          color: "var(--reader-text3)",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        {label}
      </div>
      <pre
        style={{
          fontFamily: "var(--reader-mono)",
          fontSize: "11px",
          color: "var(--reader-text2)",
          lineHeight: "1.7",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
