// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// SignSdfDialog — three-step signing flow.
//
//   Step 1 "pick"    — choose signing identity (self-signed key OR OS certificate)
//   Step 2 "confirm" — review selected identity before committing
//   Step 3 "done"    — success / error result
//
// The dialog is a fixed overlay (avoids native <dialog> WebView quirks).

import { useEffect, useId, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  FileSignature,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CertPickerStep } from "@/components/sign/CertPickerStep";
import {
  signSdfDocument,
  signSdfWithCertificate,
  type CertInfo,
} from "@/lib/tauri/sign";
import { tauriErrorMessage } from "@/lib/tauri/keychain";
import type { SDFSignerInfo } from "@etapsky/sdf-kit/signer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "pick" | "confirm" | "signing" | "done";

type DoneState =
  | { ok: true;  signer_info: SDFSignerInfo | undefined }
  | { ok: false; message: string };

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  absolutePath: string;
  filename:     string;
  onSigned?:    () => void;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function SignSdfDialog({
  open, onOpenChange, absolutePath, filename, onSigned,
}: Props) {
  const { t }  = useTranslation();
  const titleId = useId();
  const descId  = useId();

  const [step, setStep]               = useState<Step>("pick");
  const [selected, setSelected]       = useState<string>("self_signed");
  const [selectedCert, setSelectedCert] = useState<CertInfo | null>(null);
  const [done, setDone]               = useState<DoneState | null>(null);
  const [includeTsa, setIncludeTsa]   = useState(false);

  // Reset on every open
  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setDone(null);
    setSelected("self_signed");
    setSelectedCert(null);
  }, [open]);

  // ESC key — close if not mid-signing
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "signing") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, onOpenChange]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleBackdropPointerDown = (e: SyntheticEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || step === "signing") return;
    onOpenChange(false);
  };

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleNext = () => setStep("confirm");

  const handleSign = async () => {
    setStep("signing");
    try {
      let result;
      if (selected === "self_signed") {
        result = await signSdfDocument(absolutePath);
      } else {
        // Derive algorithm from the selected certificate's key type.
        // RSA keys → RSASSA-PKCS1-v1_5, everything else → ECDSA.
        const keyAlgo = selectedCert?.key_algorithm ?? "";
        const algorithm = keyAlgo.startsWith("RSA")
          ? "RSASSA-PKCS1-v1_5"
          : "ECDSA";
        result = await signSdfWithCertificate({
          path:        absolutePath,
          fingerprint: selected,
          algorithm,
          includePDF:  true,
          includeTsa,
        });
      }

      if (result.status === "signed") {
        setDone({ ok: true, signer_info: result.signer_info });
        setStep("done");
        onSigned?.();
      } else {
        setDone({ ok: false, message: result.message ?? result.status });
        setStep("done");
      }
    } catch (err) {
      setDone({ ok: false, message: tauriErrorMessage(err) });
      setStep("done");
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-[oklch(0%_0_0/0.42)] backdrop-blur-[3px]"
        aria-hidden
        onPointerDown={handleBackdropPointerDown}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[10001] flex max-h-[min(92vh,680px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[--color-border] bg-[var(--color-surface)] text-[--color-fg] shadow-[var(--shadow-lg)]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="border-b border-[--color-border-subtle] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--color-accent)_42%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_22%,var(--color-surface))] text-[var(--color-accent)] shadow-[inset_0_1px_0_oklch(100%_0_0/0.12)]">
              <FileSignature className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold leading-tight">
                {t("sign.dialogTitle")}
              </h2>
              <p id={descId} className="mt-1 text-sm text-[--color-muted]">
                {step === "pick"    && t("sign.dialogDescPick")}
                {step === "confirm" && t("sign.dialogDescConfirm")}
                {step === "signing" && t("sign.dialogDescSigning")}
                {step === "done"    && (done?.ok ? t("sign.dialogDescSuccess") : t("sign.dialogDescError"))}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-3 flex gap-1.5">
            {(["pick", "confirm", "done"] as const).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  (step === "pick"    && i <= 0) ||
                  (step === "confirm" && i <= 1) ||
                  (step === "signing" && i <= 1) ||
                  (step === "done"    && i <= 2)
                    ? "bg-[--color-primary]"
                    : "bg-[--color-border-subtle]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">

          {/* File label */}
          <div className="mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[--color-muted]">
              {t("sign.targetFile")}
            </div>
            <div
              className="mt-1 truncate font-mono text-xs text-[var(--color-accent)]"
              title={absolutePath}
            >
              {filename}
            </div>
          </div>

          {/* Step: pick */}
          {step === "pick" && (
            <div className="flex flex-col gap-4">
              <CertPickerStep
                selected={selected}
                onChange={setSelected}
                onCertChange={setSelectedCert}
                disabled={false}
              />

              {/* TSA toggle */}
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeTsa}
                  onChange={(e) => setIncludeTsa(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[--color-primary]"
                  disabled={selected === "self_signed"} // TSA only for x509 path
                />
                <span className="text-xs text-[--color-muted-fg]">
                  {t("sign.includeTsa")}
                </span>
              </label>
            </div>
          )}

          {/* Step: confirm */}
          {step === "confirm" && (
            <ConfirmStep selected={selected} filename={filename} />
          )}

          {/* Step: signing */}
          {step === "signing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
              <p className="text-sm text-[--color-muted-fg]">{t("sign.signingInProgress")}</p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && done && (
            <DoneStep done={done} />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 border-t border-[--color-border-subtle] bg-[var(--color-surface)] px-5 py-3">
          {step !== "signing" && step !== "done" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => step === "confirm" ? setStep("pick") : onOpenChange(false)}
            >
              {step === "confirm" ? t("sign.back") : t("sign.cancel")}
            </Button>
          )}

          {step === "pick" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!selected}
              onClick={handleNext}
              className="gap-1.5"
            >
              {t("sign.next")}
            </Button>
          )}

          {step === "confirm" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSign}
              className="gap-1.5"
            >
              <FileSignature className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              {t("sign.signNow")}
            </Button>
          )}

          {step === "done" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("sign.close")}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── ConfirmStep ──────────────────────────────────────────────────────────────

function ConfirmStep({ selected, filename }: { selected: string; filename: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-[--color-border-subtle] bg-[--color-surface-elevated] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[--color-success]" />
          <div>
            <p className="text-sm font-medium text-[--color-fg]">
              {selected === "self_signed"
                ? t("sign.confirmSelfSigned")
                : t("sign.confirmX509")}
            </p>
            <p className="mt-1 text-xs text-[--color-muted]">
              {selected === "self_signed"
                ? t("sign.confirmSelfSignedDesc")
                : t("sign.confirmX509Desc")}
            </p>
            {selected !== "self_signed" && (
              <p className="mt-2 break-all font-mono text-[9px] text-[--color-muted] opacity-60">
                {selected}
              </p>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-[--color-muted]">
        {t("sign.confirmWarning", { file: filename })}
      </p>
    </div>
  );
}

// ─── DoneStep ─────────────────────────────────────────────────────────────────

function DoneStep({ done }: { done: DoneState }) {
  const { t } = useTranslation();
  if (done.ok) {
    const si = done.signer_info;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[--color-success]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{t("sign.successTitle")}</span>
        </div>
        {si && (
          <div className="rounded-lg border border-[--color-border-subtle] bg-[--color-surface-elevated] px-4 py-3 text-[11px] text-[--color-muted-fg] space-y-1">
            <div className="flex gap-2">
              <span className="text-[--color-muted] w-20 shrink-0">{t("sign.infoMode")}</span>
              <Badge variant={si.mode === "x509" ? "success" : "secondary"} className="text-[9px] h-4">
                {si.mode}
              </Badge>
            </div>
            {si.subject?.common_name && (
              <div className="flex gap-2">
                <span className="text-[--color-muted] w-20 shrink-0">{t("sign.infoName")}</span>
                <span>{si.subject.common_name}</span>
              </div>
            )}
            {si.subject?.organization && (
              <div className="flex gap-2">
                <span className="text-[--color-muted] w-20 shrink-0">{t("sign.infoOrg")}</span>
                <span>{si.subject.organization}</span>
              </div>
            )}
            {si.tsa_signed_at && (
              <div className="flex gap-2">
                <span className="text-[--color-muted] w-20 shrink-0">{t("sign.infoTsa")}</span>
                <span>{new Date(si.tsa_signed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[--color-danger]">
        <XCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{t("sign.errorTitle")}</span>
      </div>
      <p className="rounded-lg border border-[color-mix(in_oklch,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklch,var(--color-danger)_10%,var(--color-surface))] px-4 py-3 text-xs text-[--color-danger]">
        {done.message}
      </p>
    </div>
  );
}
