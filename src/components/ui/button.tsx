"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "text-[#1a1206] bg-[linear-gradient(180deg,#f6d9a3_0%,#e8b86b_55%,#c99545_100%)] shadow-[0_0_0_1px_rgba(255,220,160,.35)_inset,0_8px_30px_-10px_rgba(232,184,107,.55)] hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(255,230,180,.5)_inset,0_10px_40px_-10px_rgba(232,184,107,.75)]",
  secondary:
    "text-fg bg-white/[0.045] border border-white/[0.09] hover:bg-white/[0.08] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
  outline: "text-fg-muted border border-white/[0.09] hover:text-fg hover:border-white/[0.18] hover:bg-white/[0.03]",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.05]",
  danger: "text-rose bg-rose/10 border border-rose/20 hover:bg-rose/15 hover:border-rose/35",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[12px] gap-1.5 rounded-lg",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium tracking-[-0.005em] transition-all duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: "sm" | "md" }>(
  function IconButton({ label, active, className, children, size = "md", ...rest }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl text-fg-muted transition-all duration-200 hover:bg-white/[0.06] hover:text-fg active:scale-95 disabled:opacity-40",
          size === "md" ? "size-9" : "size-7 rounded-lg",
          active && "bg-white/[0.08] text-fg",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
