// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useState } from "react";

type PreviewTab = "data" | "schema" | "meta";

interface Props {
  data:   Record<string, unknown>;
  schema: Record<string, unknown>;
  meta:   Record<string, unknown>;
}

/** Minimal syntax-coloured JSON renderer — same colour semantics as demo-web JsonPreview. */
function colorJson(json: string): React.ReactNode[] {
  const lines = json.split("\n");
  return lines.map((line, i) => {
    // Colour keys and values independently
    const colored = line
      // colour string values and keys
      .replace(
        /("(?:[^"\\]|\\.)*")/g,
        (str) => `<span style="color:var(--reader-teal)">${str}</span>`,
      );

    return (
      <div key={i} style={{ display: "flex" }}>
        <span
          style={{
            minWidth:   "2.8em",
            textAlign:  "right",
            paddingRight: "1em",
            color:      "var(--reader-text3)",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {i + 1}
        </span>
        <span
          style={{ color: "var(--reader-text)", flex: 1, whiteSpace: "pre" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: colored }}
        />
      </div>
    );
  });
}

export function ProducerJsonPreview({ data, schema, meta }: Props) {
  const [tab, setTab] = useState<PreviewTab>("data");

  const content =
    tab === "data"   ? JSON.stringify(data,   null, 2) :
    tab === "schema" ? JSON.stringify(schema, null, 2) :
                       JSON.stringify(meta,   null, 2);

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "data",   label: "data.json" },
    { id: "schema", label: "schema.json" },
    { id: "meta",   label: "meta.json" },
  ];

  return (
    <div
      className="sdf-reader"
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
        minHeight:     0,
        background:    "var(--color-bg)",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display:      "flex",
          borderBottom: "1px solid var(--reader-border)",
          background:   "var(--color-bg)",
          flexShrink:   0,
          paddingLeft:  16,
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                background:   "none",
                border:       "none",
                borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                color:        active ? "var(--reader-text)" : "var(--reader-text3)",
                fontFamily:   "var(--reader-mono)",
                fontSize:     11,
                padding:      "12px 14px 10px",
                cursor:       "pointer",
                transition:   "color 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Code area */}
      <div
        style={{
          flex:      1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "auto",
          padding:   "16px 0",
          fontFamily: "var(--reader-mono)",
          fontSize:   12,
          lineHeight: 1.65,
        }}
      >
        {colorJson(content)}
      </div>
    </div>
  );
}
