// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { z } from "zod";
import { createApiClient, type ApiClientTokens } from "@/lib/api/client";

const UsageMetricSchema = z.object({
  metric: z.string(),
  used: z.number(),
  limit: z.number(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceMonthly: z.number(),
  priceYearly: z.number(),
  limits: z.object({
    documentsPerMonth: z.number(),
    apiCallsPerMonth: z.number(),
    storageGb: z.number(),
    teamMembers: z.number(),
    webhooks: z.number(),
    retention: z.number(),
  }),
  features: z.array(z.string()),
});

const SubscriptionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  planId: z.string(),
  status: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  trialEnd: z.string().optional(),
});

export type UsageMetric = z.infer<typeof UsageMetricSchema>;
export type BillingPlan = z.infer<typeof PlanSchema>;
export type BillingSubscription = z.infer<typeof SubscriptionSchema>;

const UsageSeriesPointSchema = z.object({
  date: z.string(),
  documents: z.number(),
  apiCalls: z.number(),
  storageGb: z.number(),
});

export type UsageSeriesPoint = z.infer<typeof UsageSeriesPointSchema>;

export function createBillingEndpoints(baseUrl: string, tokens: ApiClientTokens) {
  const client = createApiClient(baseUrl, tokens);

  return {
    usage() {
      return client.get<unknown>("/v1/billing/usage").then((raw) => z.array(UsageMetricSchema).parse(raw));
    },
    usageSeries(days: number) {
      const d = Math.min(90, Math.max(1, days));
      return client
        .get<unknown>(`/v1/billing/usage/series?days=${d}`)
        .then((raw) => z.array(UsageSeriesPointSchema).parse(raw));
    },
    plan() {
      return client.get<unknown>("/v1/billing/plan").then((raw) => PlanSchema.parse(raw));
    },
    subscription() {
      return client.get<unknown>("/v1/billing/subscription").then((raw) => SubscriptionSchema.parse(raw));
    },
  };
}
