// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppErrorBoundary>
          <AppShell />
        </AppErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
