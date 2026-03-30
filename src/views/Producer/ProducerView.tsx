// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { buildSDF } from "@etapsky/sdf-kit/producer";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Download, GripVertical, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_DOC_CONFIGS, type ProduceState } from "@/schemas";
import { ProducerDocTypeSelector } from "./ProducerDocTypeSelector";
import { ProducerFormRenderer }    from "./ProducerFormRenderer";
import { ProducerJsonPreview }     from "./ProducerJsonPreview";
import { saveSdfAs } from "@/lib/tauri/dialog";
import { useToast } from "@/components/notifications/ToastProvider";
import { useDocumentStore } from "@/stores/documentStore";

// ── Panel width helpers (mirrors DocumentReaderView) ──────────────────────────

function defaultFormPanelWidthPx(): number {
  if (typeof window === "undefined") return 440;
  return Math.min(480, Math.round(window.innerWidth * 0.40));
}

function clampFormPanelWidthPx(w: number): number {
  if (typeof window === "undefined") return w;
  const min = 280;
  const max = Math.min(720, Math.floor(window.innerWidth * 0.65));
  return Math.max(min, Math.min(max, Math.round(w)));
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function ProducerView({ onClose }: Props) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const addRecent = useDocumentStore((s) => s.addRecent);

  const [docTypeId, setDocTypeId] = useState<string>("purchase-order");
  const [values,    setValues]    = useState<Record<string, string>>({});
  const [genState,  setGenState]  = useState<ProduceState>({ status: "idle" });

  // Resizable form panel
  const [formWidth, setFormWidth] = useState(defaultFormPanelWidthPx);
  const [resizing,  setResizing]  = useState(false);
  const formWidthRef = useRef(formWidth);
  const dragSessionRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  useLayoutEffect(() => { formWidthRef.current = formWidth; }, [formWidth]);

  const config = ALL_DOC_CONFIGS.find((c) => c.id === docTypeId)!;

  const handleDocTypeChange = useCallback((id: string) => {
    setDocTypeId(id);
    setValues({});
    setGenState({ status: "idle" });
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setGenState({ status: "idle" });
  }, []);

  // Live preview
  const previewData = useMemo(() => {
    try { return config.buildData(values); } catch { return {}; }
  }, [config, values]);

  const previewMeta = useMemo(() => ({
    sdf_version:         "0.1",
    document_id:         "(generated on build)",
    document_type:       config.documentType ?? config.id,
    issuer:              config.issuer,
    issuer_id:           config.issuerId,
    recipient:           config.recipient,
    recipient_id:        config.recipientId,
    schema_id:           config.schemaId,
    created_at:          new Date().toISOString(),
    signature_algorithm: null,
  }), [config]);

  // Generate & save
  const handleGenerate = useCallback(async () => {
    setGenState({ status: "generating" });
    try {
      const data   = config.buildData(values);
      const buffer = await buildSDF({
        data,
        schema:       config.schema,
        issuer:       config.issuer,
        issuerId:     config.issuerId,
        documentType: config.documentType ?? config.id,
        recipient:    config.recipient,
        recipientId:  config.recipientId,
        schemaId:     config.schemaId,
      });

      const defaultName = `${config.id}-${new Date().toISOString().slice(0, 10)}.sdf`;
      const savePath = await saveSdfAs(defaultName);
      if (!savePath) {
        setGenState({ status: "idle" });
        return;
      }

      await writeFile(savePath, buffer);
      const parts    = savePath.split(/[/\\]/);
      const filename = parts[parts.length - 1] || defaultName;
      addRecent(savePath);
      setGenState({ status: "done", filename });
      notify({
        variant: "success",
        title: t("producer.generateSuccess"),
        message: t("document.savedAs", { file: filename }),
      });
    } catch (err) {
      setGenState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      notify({
        variant: "error",
        title: t("producer.generateError"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [config, values, notify, t, addRecent]);

  // ── Resize drag handlers ──────────────────────────────────────────────────

  const endDrag = useCallback((target: HTMLDivElement | null, pointerId: number) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== pointerId) return;
    if (target?.hasPointerCapture?.(pointerId)) {
      try { target.releasePointerCapture(pointerId); } catch { /* already released */ }
    }
    dragSessionRef.current = null;
    setResizing(false);
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragSessionRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: formWidthRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    // Dragging left = smaller form width (user wants to see more preview)
    const delta = session.startX - e.clientX;
    const next  = clampFormPanelWidthPx(session.startWidth + delta);
    formWidthRef.current = next;
    setFormWidth(next);
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endDrag(e.currentTarget, e.pointerId);
    },
    [endDrag],
  );

  const onResizeDoubleClick = useCallback(() => {
    const w = clampFormPanelWidthPx(defaultFormPanelWidthPx());
    formWidthRef.current = w;
    setFormWidth(w);
  }, []);

  // ── Resize cursor effect ──────────────────────────────────────────────────

  const resizingEffect = resizing
    ? " [&~*]:pointer-events-none"
    : "";

  if (resizing) {
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  } else {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  // ─────────────────────────────────────────────────────────────────────────

  const isGenerating = genState.status === "generating";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[--color-bg]">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[--color-border-subtle] px-4 py-2.5">
        <Button type="button" variant="ghost" size="sm" className="-ml-1 gap-1.5" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          {t("document.back")}
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm font-medium text-[--color-fg]">
            {t("producer.title")}
          </span>

          {/* scenario badge */}
          {config && (
            <span
              className="shrink-0 rounded-md border border-[--color-border-subtle] bg-[--color-surface-elevated] px-2 py-0.5 text-[10px] font-medium text-[--color-muted]"
              style={{ fontFamily: "var(--reader-mono)" }}
            >
              {config.scenario} · {config.label}
            </span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* State feedback */}
            {genState.status === "done" && (
              <span className="flex items-center gap-1.5 text-xs text-[--color-success]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {genState.filename}
              </span>
            )}
            {genState.status === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-[--color-danger]" title={genState.message}>
                <XCircle className="h-3.5 w-3.5" />
                {t("producer.generateError")}
              </span>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="gap-1.5"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {isGenerating ? t("producer.generating") : t("producer.generateSave")}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: preview (left) + resize handle + form (right) ───────────── */}
      <div className={`flex min-h-0 min-w-0 flex-1${resizingEffect}`}>

        {/* Left — JSON preview */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[--color-bg]">
          <ProducerJsonPreview
            data={previewData}
            schema={config.schema as Record<string, unknown>}
            meta={previewMeta as Record<string, unknown>}
          />
        </div>

        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("document.resizePanels")}
          className="group relative z-10 flex w-4 shrink-0 cursor-col-resize items-center justify-center border-x border-[--color-border-subtle] bg-[--color-bg] hover:bg-[--color-sidebar-hover]/35"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onDoubleClick={onResizeDoubleClick}
          onLostPointerCapture={(e) => {
            if (dragSessionRef.current?.pointerId === e.pointerId) {
              endDrag(e.currentTarget, e.pointerId);
            }
          }}
          style={{ touchAction: "none" }}
        >
          <span className="pointer-events-none flex h-9 w-5 items-center justify-center rounded-full border border-[--color-border-subtle] bg-[--color-surface-elevated] text-[--color-muted] shadow-sm transition-[color,background-color] group-hover:border-[--color-border] group-hover:bg-[--color-sidebar-hover]">
            <GripVertical className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
          </span>
        </div>

        {/* Right — Form panel */}
        <aside
          className="sdf-reader flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-[--color-border-subtle] bg-[--color-bg]"
          style={{
            width:     formWidth,
            minWidth:  0,
            ...(resizing ? { transition: "none" } : {}),
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 [scrollbar-gutter:stable]">
            {/* Doc type label */}
            <div
              style={{
                fontFamily:    "var(--reader-mono)",
                fontSize:      9,
                fontWeight:    600,
                letterSpacing: "0.12em",
                color:         "var(--color-muted)",
                textTransform: "uppercase",
                marginBottom:  8,
              }}
            >
              {t("producer.documentType")}
            </div>

            <ProducerDocTypeSelector
              configs={ALL_DOC_CONFIGS}
              selected={docTypeId}
              onChange={handleDocTypeChange}
            />

            {/* Description */}
            <p
              style={{
                fontFamily:   "var(--reader-sans)",
                fontSize:     12,
                color:        "var(--color-muted-fg)",
                marginBottom: 20,
                lineHeight:   1.6,
              }}
            >
              {config.description}
            </p>

            <ProducerFormRenderer
              fields={config.fields}
              values={values}
              onChange={handleFieldChange}
            />

            {/* Meta info footer */}
            <div
              style={{
                marginTop:    24,
                padding:      "12px",
                borderRadius: 6,
                background:   "var(--color-surface)",
                border:       "1px solid var(--color-border-subtle)",
              }}
            >
              <div
                style={{
                  fontFamily:    "var(--reader-mono)",
                  fontSize:      9,
                  fontWeight:    600,
                  letterSpacing: "0.12em",
                  color:         "var(--color-muted)",
                  textTransform: "uppercase",
                  marginBottom:  8,
                }}
              >
                {t("producer.metaInfo")}
              </div>
              {[
                ["issuer",     config.issuer],
                ["issuerId",   config.issuerId],
                ["recipient",  config.recipient],
                ["schemaId",   config.schemaId],
              ].filter((r) => r[1]).map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display:      "flex",
                    gap:          8,
                    marginBottom: 4,
                    alignItems:   "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontFamily:    "var(--reader-mono)",
                      fontSize:      10,
                      color:         "var(--color-muted)",
                      minWidth:      "5em",
                      flexShrink:    0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--reader-mono)",
                      fontSize:   10,
                      color:      "var(--color-fg)",
                      wordBreak:  "break-all",
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* SDF structure hint */}
            <div
              style={{
                marginTop:    12,
                padding:      "10px 12px",
                borderRadius: 6,
                background:   "var(--color-surface)",
                border:       "1px solid var(--color-border-subtle)",
                fontFamily:   "var(--reader-mono)",
                fontSize:     10,
                color:        "var(--color-muted-fg)",
                lineHeight:   1.7,
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--color-muted)", marginBottom: 4, letterSpacing: "0.08em" }}>
                {t("producer.sdfContents")}
              </div>
              {["visual.pdf", "data.json", "schema.json", "meta.json"].map((f) => (
                <div key={f}>· {f}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
