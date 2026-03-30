// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { relaunch } from "@tauri-apps/plugin-process";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

export type InstallProgress = {
  downloaded: number;
  total?: number;
};

/**
 * Streams download progress then relaunches into the updated build.
 * Call only after the user confirms; Windows may exit the process during install.
 */
export async function downloadInstallAndRelaunch(
  update: Update,
  onProgress?: (p: InstallProgress) => void
): Promise<void> {
  let downloaded = 0;
  let total: number | undefined;

  await update.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength;
        onProgress?.({ downloaded: 0, total });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
        break;
      case "Finished":
        onProgress?.({ downloaded, total });
        break;
      default:
        break;
    }
  });

  await relaunch();
}
