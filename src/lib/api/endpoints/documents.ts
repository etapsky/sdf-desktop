// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { z } from "zod";
import { createApiClient, type ApiClientTokens } from "@/lib/api/client";

const CloudDocumentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  filename: z.string(),
  size: z.number(),
  status: z.string(),
  schemaId: z.string().nullable().optional(),
  schemaVersion: z.string().optional(),
  signatureValid: z.boolean().optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const ListResponseSchema = z.object({
  data: z.array(CloudDocumentSchema),
  meta: z.object({
    page: z.number(),
    perPage: z.number(),
    total: z.number(),
  }),
});

export type CloudDocument = z.infer<typeof CloudDocumentSchema>;
export type CloudDocumentList = z.infer<typeof ListResponseSchema>;

export function createDocumentsEndpoints(baseUrl: string, tokens: ApiClientTokens) {
  const client = createApiClient(baseUrl, tokens);

  return {
    list(params?: { page?: number; perPage?: number }) {
      const sp = new URLSearchParams();
      if (params?.page != null) sp.set("page", String(params.page));
      if (params?.perPage != null) sp.set("perPage", String(params.perPage));
      const q = sp.toString();
      const path = `/v1/documents${q ? `?${q}` : ""}`;
      return client.get<unknown>(path).then((raw) => ListResponseSchema.parse(raw));
    },

    upload(file: File) {
      const fd = new FormData();
      fd.append("file", file);
      return client.postMultipart<unknown>("/v1/documents/upload", fd).then((raw) => CloudDocumentSchema.parse(raw));
    },

    remove(id: string) {
      return client.delete(`/v1/documents/${encodeURIComponent(id)}`);
    },

    downloadBytes(id: string) {
      return client.getBinary(`/v1/documents/${encodeURIComponent(id)}/file`);
    },
  };
}
