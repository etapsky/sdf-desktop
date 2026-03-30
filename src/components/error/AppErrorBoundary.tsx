// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import React, { Component } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast, type ToastInput } from "@/components/notifications/ToastProvider";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type InnerProps = {
  children: React.ReactNode;
  t: (key: string, opts?: Record<string, unknown>) => string;
  notify: (toast: ToastInput) => void;
};

type InnerState = {
  hasError: boolean;
};

export function AppErrorBoundary({ children }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const { notify } = useToast();

  return <InnerBoundary t={t} notify={notify}>{children}</InnerBoundary>;
}

class InnerBoundary extends Component<InnerProps, InnerState> {
  public state: InnerState = { hasError: false };

  componentDidCatch(error: unknown) {
    // Centralized UX for unexpected exceptions.
    const message = error instanceof Error ? error.message : this.props.t("error.unexpected");
    this.props.notify({
      variant: "error",
      title: this.props.t("error.title"),
      message,
    });
    this.setState({ hasError: true });
    // Keep the full error for debugging.
    console.error("AppErrorBoundary caught:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
          background: "var(--color-bg)",
        }}
      >
        <div style={{ maxWidth: 560, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--reader-mono)", fontWeight: 700 }}>
            {this.props.t("error.unexpected")}
          </div>
          <div style={{ color: "var(--color-muted-fg)", marginTop: 8, fontSize: 13 }}>
            {this.props.t("error.reloadDesc")}
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          {this.props.t("error.reload")}
        </Button>
      </div>
    );
  }
}

