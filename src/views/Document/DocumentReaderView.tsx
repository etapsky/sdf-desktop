// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { parseSDF, SDFError, type SDFParseResult } from "@etapsky/sdf-kit";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
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
  const blobRef = useRef<string | null>(null);

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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[--color-border-subtle] bg-[--color-surface]">
            <iframe
              title={t("document.pdfPreview")}
              src={pdfUrl}
              className="min-h-0 min-w-0 flex-1 border-0"
            />
          </div>
          <aside className="sdf-reader flex min-h-0 w-[min(448px,45vw)] shrink-0 select-text flex-col overflow-hidden border-l border-[--color-border-subtle] bg-[--color-bg]">
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
