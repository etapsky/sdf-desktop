// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const RawFileMetadataSchema = z.object({
  size: z.number(),
  modified: z.number().nullable(),
  is_file: z.boolean(),
});

export type FileMetadata = {
  size: number;
  modified: number | null;
  isFile: boolean;
};

export async function readSdfFile(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_sdf_file", { path });
  return new Uint8Array(bytes);
}

export async function getFileMetadata(path: string): Promise<FileMetadata> {
  const meta = await invoke<unknown>("get_file_metadata", { path });
  const parsed = RawFileMetadataSchema.parse(meta);
  return {
    size: parsed.size,
    modified: parsed.modified,
    isFile: parsed.is_file,
  };
}

export async function writeTempSdfFile(data: ArrayBuffer, filename: string): Promise<string> {
  return invoke<string>("write_temp_sdf_file", {
    data: Array.from(new Uint8Array(data)),
    filename,
  });
}

