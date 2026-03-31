// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

/** Shared with Cloud Sync + Settings billing (same cache). */
export const billingUsageQueryKey = (tenantId: string | null | undefined) =>
  ["cloud", "billing", "usage", { tenantId: tenantId ?? "signed-out" }] as const;

export const queryKeys = {
  billing: {
    usage: (tenantId: string | null | undefined) => billingUsageQueryKey(tenantId),
    usageSeries: (days: number) => ["billing", "usage", "series", { days }] as const,
    plan: () => ["billing", "plan"] as const,
    subscription: () => ["billing", "subscription"] as const,
  },
  cloud: {
    documents: (page: number, perPage: number) => ["cloud", "documents", { page, perPage }] as const,
    usage: (tenantId: string | null | undefined) => billingUsageQueryKey(tenantId),
  },
};
