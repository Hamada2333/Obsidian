"use client";

import { useState } from "react";
import { Check, RefreshCw, Sparkles, Tags, Wand2 } from "lucide-react";
import { aiJSON, AIError, useAIStatus, useAIStream } from "@/lib/ai/client";
import type { AIRequest, CategorizeResult } from "@/lib/ai/prompts";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { AINotConfigured, AIThinking } from "./ai-notice";

/** Streams an AI result (summary / expansion) and lets the user keep it. */
export function AIStreamCard({
  title,
  request,
  saved,
  onSave,
  saveLabel = "Save",
  cta,
}: {
  title: string;
  request: () => AIRequest;
  saved?: string;
  onSave?: (text: string) => void;
  saveLabel?: string;
  cta: string;
}) {
  const status = useAIStatus();
  const ai = useAIStream();
  const shown = ai.text || (!ai.loading && !ai.error ? saved : "");
  const fresh = !!ai.text && !ai.loading && ai.text !== saved;
  return (
    <div className="rounded-2xl border border-gold/15 bg-[linear-gradient(180deg,rgba(232,184,107,0.06),rgba(232,184,107,0.015))] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-gold/90">
          <Sparkles className="size-3" /> {title}
        </p>
        {status?.configured && shown && !ai.loading && (
          <button onClick={() => ai.run(request())} className="rounded-md p-1 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Regenerate" title="Regenerate">
            <RefreshCw className="size-3.5" />
          </button>
        )}
      </div>
      {status && !status.configured ? (
        <AINotConfigured compact className="border-0 bg-transparent p-0" />
      ) : ai.error ? (
        <p className="text-[13px] text-rose">{ai.error.message}</p>
      ) : shown ? (
        <Markdown source={shown} className="text-[13.5px] leading-relaxed [&_h2]:text-[13px] [&_p]:text-fg-muted" />
      ) : ai.loading ? (
        <AIThinking />
      ) : (
        <Button size="sm" variant="secondary" icon={<Wand2 className="size-3.5" />} onClick={() => ai.run(request())} disabled={!status}>
          {cta}
        </Button>
      )}
      {ai.loading && shown && <div className="mt-2"><AIThinking label="Writing" /></div>}
      {fresh && onSave && (
        <Button size="xs" variant="primary" className="mt-3" icon={<Check className="size-3" />} onClick={() => onSave(ai.text)}>
          {saveLabel}
        </Button>
      )}
    </div>
  );
}

/** Suggests a category and tags; user applies with one click. */
export function AICategorize({ request, onApply }: { request: () => Extract<AIRequest, { task: "categorize" }>; onApply: (r: CategorizeResult) => void }) {
  const status = useAIStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CategorizeResult | null>(null);
  if (status && !status.configured) return null;
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      setResult(await aiJSON<CategorizeResult>(request()));
    } catch (e) {
      setErr(e instanceof AIError ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {!result ? (
        <Button size="xs" variant="ghost" className="-ml-2 text-gold/90" icon={<Tags className="size-3.5" />} loading={busy} onClick={run}>
          Suggest category & tags
        </Button>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-[12px] text-fg-subtle">
            Suggested category <span className="text-fg">{result.category}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {result.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="xs"
              variant="primary"
              onClick={() => {
                onApply(result);
                setResult(null);
              }}
            >
              Apply
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {err && <p className="mt-1 text-[12px] text-rose">{err}</p>}
    </div>
  );
}
