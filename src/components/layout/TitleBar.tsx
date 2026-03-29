// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { cn } from "@/lib/utils";

interface TitleBarProps {
  className?: string;
  children?: React.ReactNode;
}

export function TitleBar({ className, children }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex h-10 items-center border-b border-[--color-border-subtle] bg-[--color-bg] px-4 shrink-0",
        className
      )}
    >
      {/* macOS traffic-light spacer (sidebar already has it, this is the content area) */}
      {children && (
        <div className="flex items-center gap-2 ml-auto">{children}</div>
      )}
    </div>
  );
}
