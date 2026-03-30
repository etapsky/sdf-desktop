// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getLaunchSdfPaths } from "@/lib/tauri/open";

type SdfOpenPayload = { paths: string[] };

/**
 * First launch: argv may contain `.sdf` paths. Subsequent opens: `sdf-open-paths` from single-instance.
 */
export function useSdfOpenListener(onOpenPath: (path: string) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const paths = await getLaunchSdfPaths();
        const first = paths[0];
        if (first) onOpenPath(first);
      } catch {
        /* not in Tauri */
      }

      try {
        unlisten = await listen<SdfOpenPayload>("sdf-open-paths", (event) => {
          const p = event.payload.paths[0];
          if (p) onOpenPath(p);
        });
      } catch {
        /* no IPC */
      }
    })();

    return () => {
      unlisten?.();
    };
  }, [onOpenPath]);
}
