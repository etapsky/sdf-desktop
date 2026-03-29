// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-1 focus-visible:ring-offset-[--color-bg] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[--color-primary] text-[--color-primary-fg] hover:bg-[--color-primary-hover] active:scale-[0.97]",
        secondary:
          "bg-[--color-surface-elevated] text-[--color-fg] border border-[--color-border] hover:bg-[--color-border] active:scale-[0.97]",
        ghost:
          "text-[--color-muted-fg] hover:bg-[--color-surface-elevated] hover:text-[--color-fg] active:scale-[0.97]",
        destructive:
          "bg-[--color-danger] text-[--color-danger-fg] hover:opacity-90 active:scale-[0.97]",
        outline:
          "border border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary-muted] active:scale-[0.97]",
        link: "text-[--color-primary] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2.5 py-1 text-xs",
        lg: "h-10 px-5 py-2 text-base",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
