// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

export interface FormField {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "email" | "textarea" | "money";
  placeholder?: string;
  required?: boolean;
  group?: string;
  width?: "full" | "half";
}

export interface DocTypeConfig {
  id: string;
  label: string;
  description: string;
  scenario: "B2B" | "B2G" | "G2G";
  fields: FormField[];
  buildData: (values: Record<string, string>) => Record<string, unknown>;
  schema: Record<string, unknown>;
  issuer: string;
  issuerId?: string;
  recipient?: string;
  recipientId?: string;
  schemaId?: string;
  documentType?: string;
}

export type ProduceState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; filename: string }
  | { status: "error"; message: string };
