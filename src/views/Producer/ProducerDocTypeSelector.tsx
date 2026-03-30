// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { DocTypeConfig } from "@/schemas";

interface Props {
  configs: DocTypeConfig[];
  selected: string;
  onChange: (id: string) => void;
}

const SCENARIO_COLOR: Record<string, string> = {
  B2B: "var(--color-accent)",
  B2G: "var(--color-danger)",
  G2G: "var(--color-amber)",
};

export function ProducerDocTypeSelector({ configs, selected, onChange }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        marginBottom: 20,
      }}
    >
      {configs.map((c) => {
        const active = c.id === selected;
        const color  = SCENARIO_COLOR[c.scenario] ?? "var(--color-primary)";
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            style={{
              background:   active ? `color-mix(in oklch, ${color} 18%, var(--color-bg))` : "var(--color-surface)",
              border:       `1px solid ${active ? color : "var(--color-border-subtle)"}`,
              borderRadius: 6,
              padding:      "7px 8px",
              cursor:       "pointer",
              textAlign:    "left",
              transition:   "border-color 0.15s, background 0.15s",
            }}
          >
            <div
              style={{
                fontFamily:    "var(--reader-mono, monospace)",
                fontSize:      10,
                fontWeight:    600,
                color,
                letterSpacing: "0.08em",
                marginBottom:  2,
              }}
            >
              {c.scenario}
            </div>
            <div
              style={{
                fontFamily: "var(--reader-sans, sans-serif)",
                fontSize:   11,
                fontWeight: active ? 500 : 400,
                color:      active ? "var(--color-fg)" : "var(--color-muted-fg)",
                lineHeight: 1.3,
              }}
            >
              {c.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
