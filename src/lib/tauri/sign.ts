// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const SignSdfResultSchema = z.object({
  status: z.enum(["signed", "not_implemented", "unsupported"]),
  message: z.string(),
});

export type SignSdfStatus = z.infer<typeof SignSdfResultSchema>["status"];

export type SignSdfResult = {
  status: SignSdfStatus;
  message: string;
};

/** Invoke local SDF signing (Faz 1c: stub; Faz 3: real crypto). */
export async function signSdfDocument(absolutePath: string): Promise<SignSdfResult> {
  const raw = await invoke<unknown>("sign_sdf_document", { path: absolutePath });
  return SignSdfResultSchema.parse(raw);
}
