// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Mirrors sdf/apps/demo-reader SchemaPanel.
export function ReaderSchemaPanel({ schema }: { schema: Record<string, unknown> }) {
  const required = (schema.required as string[] | undefined) ?? [];
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;

  if (!properties) {
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
            color: "var(--reader-text3)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}
        >
          schema.json
        </div>
        <div
          style={{
            fontFamily: "var(--reader-sans)",
            fontSize: "12px",
            color: "var(--reader-text3)",
            marginTop: "12px",
          }}
        >
          No schema defined.
        </div>
      </div>
    );
  }

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
        schema.json
      </div>

      {Boolean(schema.$id || schema.title) && (
        <div style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--reader-border)" }}>
          {schema.title != null && (
            <div
              style={{
                fontFamily: "var(--reader-sans)",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--reader-text)",
                marginBottom: "4px",
              }}
            >
              {String(schema.title)}
            </div>
          )}
          {schema.$id != null && (
            <div
              style={{
                fontFamily: "var(--reader-mono)",
                fontSize: "10px",
                color: "var(--reader-text3)",
                wordBreak: "break-all",
              }}
            >
              {String(schema.$id)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {Object.entries(properties).map(([key, def]) => {
          const isRequired = required.includes(key);
          return (
            <div
              key={key}
              className="schema-panel-row"
              style={{
                display: "grid",
                gridTemplateColumns: "140px 80px 1fr",
                gap: "8px",
                padding: "4px 0",
                borderBottom: "1px solid var(--reader-border)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--reader-mono)",
                  fontSize: "11px",
                  color: isRequired ? "var(--reader-accent2)" : "var(--reader-text2)",
                }}
              >
                {key}
                {isRequired && <span style={{ color: "var(--reader-coral)" }}> *</span>}
              </span>
              <span style={{ fontFamily: "var(--reader-mono)", fontSize: "10px", color: "var(--reader-amber)" }}>
                {(def.type as string) ?? "—"}
              </span>
              <span style={{ fontFamily: "var(--reader-sans)", fontSize: "11px", color: "var(--reader-text3)" }}>
                {(def.description as string) ?? (def.const ? `= "${def.const}"` : "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
