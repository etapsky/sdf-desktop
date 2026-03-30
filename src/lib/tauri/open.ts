// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { invoke } from "@tauri-apps/api/core";

export async function getLaunchSdfPaths(): Promise<string[]> {
  return invoke<string[]>("get_launch_sdf_paths");
}

