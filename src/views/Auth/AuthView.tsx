// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import etapskyLogo from "@/assets/etapsky_horizonral_logo.svg";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { LoginInputSchema, RegisterInputSchema, type LoginInput, type RegisterInput } from "@/lib/api/endpoints/auth";
import { formatAuthError } from "@/lib/api/authErrorMessage";

type Mode = "login" | "register";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[--color-muted-fg]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-[--color-danger]">{error}</span>}
    </label>
  );
}

export function AuthView() {
  const { t } = useTranslation();
  const { login, register, loginWithMicrosoft } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setShowPassword(false);
  }, [mode]);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: "", password: "" },
  });
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { companyName: "", name: "", email: "", password: "" },
  });

  const onSubmitLogin = loginForm.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await login(values);
    } catch (e) {
      setError(formatAuthError(t, e));
    } finally {
      setBusy(false);
    }
  });

  const onSubmitRegister = registerForm.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await register(values);
    } catch (e) {
      setError(formatAuthError(t, e));
    } finally {
      setBusy(false);
    }
  });

  const onMicrosoftSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithMicrosoft();
    } catch (e) {
      setError(formatAuthError(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[--color-bg] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_480px_at_75%_-10%,color-mix(in_oklch,var(--color-primary)_26%,transparent),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(980px_420px_at_15%_120%,color-mix(in_oklch,var(--color-accent)_18%,transparent),transparent_70%)]" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-[--color-border] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[--color-border-subtle] bg-[--color-surface-elevated]">
            <ShieldCheck className="h-5 w-5 text-[--color-primary]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-[--color-fg]">{t("auth.title")}</h1>
            <p className="text-xs text-[--color-muted]">{t("auth.subtitle")}</p>
          </div>
          <img src={etapskyLogo} alt="Etapsky" className="ml-auto h-5 opacity-75" />
        </div>

        <div className="mb-4 flex gap-1.5 rounded-xl border border-[--color-border] bg-[color-mix(in_oklch,var(--color-surface-elevated)_70%,var(--color-bg))] p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
              mode === "login"
                ? "bg-[--color-primary] text-[--color-primary-fg] shadow-[0_2px_10px_color-mix(in_oklch,var(--color-primary)_42%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-primary)_35%,transparent)]"
                : "border border-[--color-border-subtle] bg-[--color-bg] text-[--color-muted-fg] shadow-sm hover:border-[--color-border] hover:bg-[--color-surface-elevated] hover:text-[--color-fg] active:scale-[0.98]"
            )}
          >
            <LogIn className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
            {t("auth.loginTab")}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
              mode === "register"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[0_2px_10px_color-mix(in_oklch,var(--color-accent)_42%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-accent)_38%,transparent)]"
                : "border border-[--color-border-subtle] bg-[--color-bg] text-[--color-muted-fg] shadow-sm hover:border-[--color-border] hover:bg-[--color-surface-elevated] hover:text-[--color-fg] active:scale-[0.98]"
            )}
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
            {t("auth.registerTab")}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-[color-mix(in_oklch,var(--color-danger)_22%,var(--color-border-subtle))] border-l-[3px] border-l-[--color-danger] bg-[color-mix(in_oklch,var(--color-danger)_16%,var(--color-surface-elevated))] px-1.5 py-1 shadow-[0_1px_0_oklch(0%_0_0/0.06)]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--color-danger)_20%,transparent)] text-[--color-danger]">
              <AlertCircle className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 py-px text-[12px] font-medium leading-tight text-[color-mix(in_oklch,var(--color-danger)_78%,var(--color-fg))]">
              {error}
            </p>
          </div>
        )}

        {mode === "login" ? (
          <form className="space-y-3" onSubmit={(e) => void onSubmitLogin(e)}>
            <Field label={t("auth.email")} error={loginForm.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[--color-muted]" />
                <input
                  {...loginForm.register("email")}
                  autoComplete="email"
                  className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] pl-9 pr-2.5 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                />
              </div>
            </Field>
            <Field label={t("auth.password")} error={loginForm.formState.errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted]" />
                <input
                  {...loginForm.register("password")}
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] pl-9 pr-10 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[--color-muted] transition-colors hover:bg-[--color-surface-elevated] hover:text-[--color-fg]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
            </Field>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "mt-1 w-full gap-2 text-sm font-semibold",
                "!bg-[var(--color-primary)] !text-[var(--color-primary-fg)] hover:!bg-[var(--color-primary-hover)] hover:!shadow-lg",
                "shadow-[0_2px_12px_color-mix(in_oklch,var(--color-primary)_38%,transparent)]",
                "ring-1 ring-[color-mix(in_oklch,var(--color-primary)_40%,transparent)] active:scale-[0.98]",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("auth.signIn")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onMicrosoftSignIn()}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full gap-2 text-sm font-semibold",
                "border-[--color-border] bg-[--color-surface-elevated] text-[--color-fg] hover:bg-[--color-bg]",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("auth.signInMicrosoft")}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void onSubmitRegister(e)}>
            <Field label={t("auth.company")} error={registerForm.formState.errors.companyName?.message}>
              <input
                {...registerForm.register("companyName")}
                className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] px-2.5 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
              />
            </Field>
            <Field label={t("auth.name")} error={registerForm.formState.errors.name?.message}>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[--color-muted]" />
                <input
                  {...registerForm.register("name")}
                  className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] pl-9 pr-2.5 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                />
              </div>
            </Field>
            <Field label={t("auth.email")} error={registerForm.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[--color-muted]" />
                <input
                  {...registerForm.register("email")}
                  autoComplete="email"
                  className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] pl-9 pr-2.5 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                />
              </div>
            </Field>
            <Field label={t("auth.password")} error={registerForm.formState.errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted]" />
                <input
                  {...registerForm.register("password")}
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg] pl-9 pr-10 text-sm text-[--color-fg] outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[--color-muted] transition-colors hover:bg-[--color-surface-elevated] hover:text-[--color-fg]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
            </Field>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "mt-1 w-full gap-2 text-sm font-semibold",
                "!bg-[var(--color-accent)] !text-[var(--color-accent-fg)] hover:!opacity-95 hover:!shadow-lg",
                "shadow-[0_2px_12px_color-mix(in_oklch,var(--color-accent)_38%,transparent)]",
                "ring-1 ring-[color-mix(in_oklch,var(--color-accent)_45%,transparent)] active:scale-[0.98]",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("auth.createAccount")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
