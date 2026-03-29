// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-[--color-primary-muted] text-[--color-primary] border border-[--color-primary]/25",
        secondary:
          "bg-[--color-surface-elevated] text-[--color-muted-fg] border border-[--color-border]",
        success:
          "bg-[--color-success-muted] text-[--color-success] border border-[--color-success]/25",
        warning:
          "bg-[--color-warning-muted] text-[--color-warning] border border-[--color-warning]/25",
        destructive:
          "bg-[--color-danger-muted] text-[--color-danger] border border-[--color-danger]/25",
        amber:
          "bg-[--color-amber-muted] text-[--color-amber] border border-[--color-amber]/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
