// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </ToastProvider>
  </React.StrictMode>
);
