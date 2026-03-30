// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const SignatureValidationSchema = z.object({
  status: z.enum(["valid", "invalid", "unsigned"]),
  reason: z.string().nullable().optional(),
});

export type SignatureStatus = z.infer<typeof SignatureValidationSchema>["status"];

export type SignatureValidation = {
  status: SignatureStatus;
  reason?: string | null;
};

export async function validateSdfSignature(path: string): Promise<SignatureValidation> {
  const raw = await invoke<unknown>("validate_sdf_signature", { path });
  return SignatureValidationSchema.parse(raw);
}

