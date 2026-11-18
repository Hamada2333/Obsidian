"use client";

import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever an AI feature is used but the server has no API key. */
export function AINotConfigured({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-gold/20 bg-gold/[0.05] p-4 text-sm", className)}>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-gold" />
        <div className="space-y-1.5">
          <p className="font-medium text-gold-soft">Connect AI to enable this</p>
          {!compact && (
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Add <code className="rounded bg-white/10 px-1 font-mono text-[12px]">ANTHROPIC_API_KEY</code> to{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[12px]">.env.local</code> and restart the server. The key stays on the server; requests go
              through <code className="rounded bg-white/10 px-1 font-mono text-[12px]">/api/ai</code>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIThinking({ label = "Thinking" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-gold-soft">
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
        <span className="relative size-2 rounded-full bg-gold" />
      </span>
      {label}…
    </span>
  );
}
