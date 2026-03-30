// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { X } from "lucide-react";
import { cn, fileNameFromPath } from "@/lib/utils";

interface DocumentTabBarProps {
  tabs: string[];
  activePath: string;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function DocumentTabBar({ tabs, activePath, onSelect, onClose }: DocumentTabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex shrink-0 items-stretch gap-0 overflow-x-auto border-b border-[--color-border-subtle] bg-[--color-sidebar]/80 px-1"
      role="tablist"
      aria-label="Open documents"
    >
      {tabs.map((path) => {
        const active = path === activePath;
        const label = fileNameFromPath(path);
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            className={cn(
              "group flex min-w-0 max-w-[200px] items-center gap-0.5 rounded-t-md border border-transparent",
              active
                ? "border-[--color-border-subtle] border-b-transparent bg-[--color-bg] text-[--color-fg]"
                : "text-[--color-muted-fg] hover:bg-[--color-surface-hover]/80 hover:text-[--color-fg]"
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs font-medium"
              onClick={() => onSelect(path)}
            >
              {label}
            </button>
            <button
              type="button"
              className="shrink-0 rounded p-1.5 text-[--color-muted] opacity-70 hover:bg-[--color-surface-hover] hover:text-[--color-fg] hover:opacity-100"
              aria-label={`Close ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
