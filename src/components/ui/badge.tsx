import type { ReactNode } from "react";
import type { Accent } from "@/lib/types";
import { cn } from "@/lib/utils";

const tone: Record<Accent | "neutral", string> = {
  gold: "text-gold-soft bg-gold/[0.09] border-gold/20",
  blue: "text-[#9ccbff] bg-blue/[0.09] border-blue/20",
  emerald: "text-[#86efc1] bg-emerald/[0.09] border-emerald/20",
  violet: "text-[#c9b8ff] bg-violet/[0.1] border-violet/20",
  rose: "text-[#fda4b4] bg-rose/[0.09] border-rose/20",
  neutral: "text-fg-muted bg-white/[0.04] border-white/[0.08]",
};

export function Badge({ children, accent = "neutral", className, dot }: { children: ReactNode; accent?: Accent | "neutral"; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11px] font-medium leading-none", tone[accent], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Tag({ children, onRemove, onClick, active }: { children: ReactNode; onRemove?: () => void; onClick?: () => void; active?: boolean }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[12px] transition-colors",
        active ? "border-gold/30 bg-gold/10 text-gold-soft" : "border-white/[0.07] bg-white/[0.03] text-fg-muted",
        onClick && "cursor-pointer hover:border-white/[0.15] hover:text-fg",
      )}
    >
      <span className="text-fg-faint">#</span>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${String(children)}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 ml-0.5 rounded px-1 text-fg-subtle hover:text-fg"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 font-mono text-[10.5px] text-fg-subtle", className)}>
      {children}
    </kbd>
  );
}
