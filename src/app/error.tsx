"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-rose/80">Something went wrong</p>
      <h1 className="mt-4 font-display text-4xl text-fg">A small singularity</h1>
      <p className="mt-3 max-w-md text-sm text-fg-muted">{error.message || "An unexpected error occurred."} Your data is safe.</p>
      <button onClick={reset} className="mt-8 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2 text-sm text-fg hover:bg-white/10">
        Try again
      </button>
    </div>
  );
}
