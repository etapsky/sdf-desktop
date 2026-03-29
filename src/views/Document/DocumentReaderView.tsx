// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useTranslation } from "react-i18next";
import { parseSDF, SDFError, type SDFParseResult } from "@etapsky/sdf-kit";
import { ArrowLeft, Download, FileText, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTree } from "@/components/reader/DataTree";
import { MetaCard } from "@/components/reader/MetaCard";
import { ReaderSchemaPanel } from "@/components/reader/ReaderSchemaPanel";
import { ReaderRawPanel } from "@/components/reader/ReaderRawPanel";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; code?: string }
  | { status: "ready"; result: SDFParseResult; fileLabel: string };

type ReaderPanel = "data" | "schema" | "meta";

/** Same default as previous fixed layout: min(448px, 45vw). */
function defaultRightPanelWidthPx(): number {
  if (typeof window === "undefined") return 448;
  return Math.min(448, Math.round(window.innerWidth * 0.45));
}

function clampRightPanelWidthPx(w: number): number {
  if (typeof window === "undefined") return w;
  const min = 260;
  const max = Math.min(960, Math.floor(window.innerWidth * 0.78));
  return Math.max(min, Math.min(max, Math.round(w)));
}

function fileNameFromPath(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

interface DocumentReaderViewProps {
  path: string;
  onClose: () => void;
}

export function DocumentReaderView({ path, onClose }: DocumentReaderViewProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [panel, setPanel] = useState<ReaderPanel>("data");
  const [pdfSaving, setPdfSaving] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(defaultRightPanelWidthPx);
  const [resizing, setResizing] = useState(false);
  const blobRef = useRef<string | null>(null);
  /** Synced with latest width — always read this on pointerdown (avoids stale closure). */
  const widthRef = useRef(rightPanelWidth);
  const dragSessionRef = useRef<{ pointerId: number; startClientX: number; startWidth: number } | null>(
    null
  );

  useLayoutEffect(() => {
    widthRef.current = rightPanelWidth;
  }, [rightPanelWidth]);

  useEffect(() => {
    setRightPanelWidth(defaultRightPanelWidthPx());
  }, [path]);

  useEffect(() => {
    const onResize = () => {
      setRightPanelWidth((w) => clampRightPanelWidthPx(w));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** While dragging: block text selection + show resize cursor (iframe uses pointer-events separately). */
  useEffect(() => {
    if (!resizing) return;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [resizing]);

  const endDrag = useCallback((target: HTMLDivElement | null, pointerId: number) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== pointerId) return;
    if (target?.hasPointerCapture?.(pointerId)) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    }
    dragSessionRef.current = null;
    setResizing(false);
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const w = widthRef.current;
    dragSessionRef.current = { pointerId: e.pointerId, startClientX: e.clientX, startWidth: w };
    el.setPointerCapture(e.pointerId);
    setResizing(true);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    const delta = e.clientX - session.startClientX;
    const next = clampRightPanelWidthPx(session.startWidth - delta);
    widthRef.current = next;
    setRightPanelWidth(next);
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      endDrag(e.currentTarget, e.pointerId);
    },
    [endDrag]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (state.status !== "ready" || pdfSaving) return;
    const defaultName = state.fileLabel.replace(/\.sdf$/i, "") + ".pdf";
    try {
      setPdfSaving(true);
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!savePath) return;
      await writeFile(savePath, state.result.pdfBytes);
    } catch {
      // user dismissed the dialog or write failed — no-op
    } finally {
      setPdfSaving(false);
    }
  }, [state, pdfSaving]);

  const onResizeDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const w = clampRightPanelWidthPx(defaultRightPanelWidthPx());
    widthRef.current = w;
    setRightPanelWidth(w);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setPdfUrl(null);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    void (async () => {
      try {
        const bytes = await invoke<number[]>("read_sdf_file", { path });
        const u8 = new Uint8Array(bytes);
        const result = (await parseSDF(u8)) as SDFParseResult;
        if (cancelled) return;
        const u = URL.createObjectURL(new Blob([result.pdfBytes], { type: "application/pdf" }));
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        blobRef.current = u;
        setPdfUrl(u);
        setState({
          status: "ready",
          result,
          fileLabel: fileNameFromPath(path),
        });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof SDFError) {
          setState({ status: "error", message: e.message, code: e.code });
        } else {
          setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [path]);

  const panelTabs: { id: ReaderPanel; label: string }[] = [
    { id: "data", label: "data.json" },
    { id: "schema", label: "schema.json" },
    { id: "meta", label: "meta.json" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[--color-bg]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[--color-border-subtle] px-4 py-2.5">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          {t("document.back")}
        </Button>
        {state.status === "ready" && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[--color-muted]" />
            <span className="truncate text-sm font-medium text-[--color-fg]">{state.fileLabel}</span>
            <span className="shrink-0 rounded-md border border-[--color-border-subtle] bg-[--color-surface-elevated] px-2 py-0.5 text-[10px] font-medium text-[--color-muted]">
              {state.result.meta.document_type ?? "—"}
            </span>
            <div className="ml-auto flex shrink-0 items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pdfSaving}
                onClick={handleDownloadPdf}
                className="gap-1.5"
              >
                {pdfSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {pdfSaving ? t("document.downloadPdfSaving") : t("document.downloadPdf")}
              </Button>
            </div>
          </div>
        )}
      </header>

      {state.status === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[--color-muted-fg]">
          <Loader2 className="h-8 w-8 animate-spin opacity-70" />
          <p className="text-sm">{t("document.loading")}</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-[--color-danger]">{t("document.errorTitle")}</p>
          {state.code && (
            <p className="font-mono text-xs text-[--color-muted]">{state.code}</p>
          )}
          <p className="max-w-md text-sm text-[--color-muted-fg]">{state.message}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t("document.back")}
          </Button>
        </div>
      )}

      {state.status === "ready" && pdfUrl && (
        <div className="flex min-h-0 min-w-0 flex-1">
          <div
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-[--color-surface] ${resizing ? "[&_iframe]:pointer-events-none" : ""}`}
          >
            <iframe
              title={t("document.pdfPreview")}
              src={pdfUrl}
              className="min-h-0 min-w-0 flex-1 border-0"
            />
          </div>

          {/* Wider invisible hit strip — WebView iframe steals events without capture + iframe pe:none */}
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
            <span
              className="pointer-events-none flex h-9 w-5 items-center justify-center rounded-full border border-[--color-border-subtle] bg-[--color-surface-elevated] text-[--color-muted] shadow-sm transition-[color,background-color] group-hover:border-[--color-border] group-hover:bg-[--color-sidebar-hover]"
              aria-hidden
            >
              <GripVertical className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
            </span>
          </div>

          <aside
            className="sdf-reader flex min-h-0 shrink-0 select-text flex-col overflow-hidden bg-[--color-bg]"
            style={{
              width: rightPanelWidth,
              minWidth: 0,
              ...(resizing ? { transition: "none" } : {}),
            }}
          >
            <div
              className="flex shrink-0 gap-0 px-4"
              style={{
                background: "var(--color-bg)",
                borderBottom: "1px solid var(--reader-border)",
              }}
            >
              {panelTabs.map((tab) => {
                const active = panel === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPanel(tab.id)}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                      color: active ? "var(--reader-text)" : "var(--reader-text3)",
                      fontFamily: "var(--reader-mono)",
                      fontSize: "11px",
                      padding: "12px 14px 10px",
                      cursor: "pointer",
                      transition: "color 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 [scrollbar-gutter:stable]">
              <div className="flex flex-col gap-3">
                {panel === "data" && (
                  <>
                    <MetaCard meta={state.result.meta} />
                    <DataTree data={state.result.data} />
                  </>
                )}
                {panel === "schema" && <ReaderSchemaPanel schema={state.result.schema} />}
                {panel === "meta" && (
                  <ReaderRawPanel
                    data={state.result.meta as unknown as Record<string, unknown>}
                    label="meta.json"
                  />
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
