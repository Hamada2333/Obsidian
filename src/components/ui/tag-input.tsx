"use client";

import { useState } from "react";
import { Tag } from "./badge";
import { cn } from "@/lib/utils";

export function TagInput({ value, onChange, suggestions = [], placeholder = "Add tag…", className }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string; className?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const matches = draft ? suggestions.filter((s) => s.startsWith(draft.toLowerCase()) && !value.includes(s)).slice(0, 5) : [];
  return (
    <div className={cn("relative", className)}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 transition-colors focus-within:border-gold/40">
        {value.map((t) => (
          <Tag key={t} onRemove={() => onChange(value.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              if (draft.trim()) {
                e.preventDefault();
                add(draft);
              }
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-faint"
        />
      </div>
      {matches.length > 0 && (
        <div className="glass-strong absolute left-0 top-full z-30 mt-1 w-full rounded-xl p-1">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(m);
              }}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-fg-muted hover:bg-white/[0.06] hover:text-fg"
            >
              #{m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
