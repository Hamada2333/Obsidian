"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-8 text-[13px] text-fg outline-none transition placeholder:text-fg-faint focus:border-gold/35"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:text-fg">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, options, allLabel = "All" }: { value: T | null; onChange: (v: T | null) => void; options: Array<{ value: T; label: ReactNode; count?: number }>; allLabel?: string }) {
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition",
      active ? "border-gold/30 bg-gold/10 text-gold-soft" : "border-white/[0.07] bg-white/[0.02] text-fg-subtle hover:border-white/[0.14] hover:text-fg-muted",
    );
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
      <button className={chip(value === null)} onClick={() => onChange(null)}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button key={o.value} className={chip(value === o.value)} onClick={() => onChange(value === o.value ? null : o.value)}>
          {o.label}
          {o.count !== undefined && <span className="text-[11px] opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
