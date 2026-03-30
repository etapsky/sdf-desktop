// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { FormField } from "@/schemas";

interface Props {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const INPUT_BASE: React.CSSProperties = {
  width:        "100%",
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border-subtle)",
  borderRadius: 5,
  padding:      "6px 9px",
  fontSize:     12,
  color:        "var(--color-fg)",
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.12s",
};

export function ProducerFormRenderer({ fields, values, onChange }: Props) {
  // Separate ungrouped vs grouped
  const ungrouped = fields.filter((f) => !f.group);
  const groupMap  = new Map<string, FormField[]>();
  for (const f of fields) {
    if (!f.group) continue;
    if (!groupMap.has(f.group)) groupMap.set(f.group, []);
    groupMap.get(f.group)!.push(f);
  }

  const renderField = (f: FormField) => {
    const value = values[f.key] ?? "";
    const isFullWidth = f.width === "full" || f.type === "textarea";

    const inputProps = {
      id:          f.key,
      value,
      placeholder: f.placeholder ?? "",
      onChange:    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                     onChange(f.key, e.target.value),
    };

    const inputStyle: React.CSSProperties = {
      ...INPUT_BASE,
      fontFamily: f.type === "money" ? "var(--reader-mono, monospace)" : undefined,
    };

    return (
      <div
        key={f.key}
        style={{
          display:    "flex",
          flexDirection: "column",
          gap:        4,
          gridColumn: isFullWidth ? "1 / -1" : undefined,
        }}
      >
        <label
          htmlFor={f.key}
          style={{
            fontFamily:    "var(--reader-mono, monospace)",
            fontSize:      10,
            fontWeight:    500,
            color:         "var(--color-muted-fg)",
            letterSpacing: "0.05em",
            userSelect:    "none",
          }}
        >
          {f.label}
          {f.required && (
            <span style={{ color: "var(--color-danger)", marginLeft: 3 }}>*</span>
          )}
        </label>

        {f.type === "textarea" ? (
          <textarea
            {...inputProps}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        ) : (
          <input
            {...inputProps}
            type={
              f.type === "date"   ? "date"   :
              f.type === "number" ? "number" :
              f.type === "email"  ? "email"  :
              "text"
            }
            min={f.type === "number" ? 0 : undefined}
            step={f.type === "number" ? "any" : undefined}
            style={inputStyle}
          />
        )}
      </div>
    );
  };

  const GRID: React.CSSProperties = {
    display:             "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap:                 "10px 12px",
    marginBottom:        16,
  };

  return (
    <div>
      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div style={GRID}>
          {ungrouped.map(renderField)}
        </div>
      )}

      {/* Grouped */}
      {[...groupMap.entries()].map(([group, gFields]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily:    "var(--reader-mono, monospace)",
              fontSize:      9,
              fontWeight:    600,
              color:         "var(--color-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              paddingBottom: 6,
              marginBottom:  10,
              borderBottom:  "1px solid var(--color-border-subtle)",
            }}
          >
            {group}
          </div>
          <div style={GRID}>
            {gFields.map(renderField)}
          </div>
        </div>
      ))}
    </div>
  );
}
