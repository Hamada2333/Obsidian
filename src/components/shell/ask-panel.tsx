"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { Drawer } from "@/components/ui/overlay";
import { IconButton } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { AINotConfigured, AIThinking } from "@/components/ai/ai-notice";
import { useBrain } from "@/lib/store/provider";
import { allDocs, type Doc } from "@/lib/entities";
import { search } from "@/lib/search";
import { aiStream, AIError, useAIStatus } from "@/lib/ai/client";
import type { ContextDoc } from "@/lib/ai/prompts";
import { cn } from "@/lib/utils";
import { KindIcon } from "./kind-icon";
import { useShell } from "./shell-context";

interface Turn {
  role: "user" | "assistant";
  content: string;
  sources?: Doc[];
  error?: string;
}

const SUGGESTIONS = ["What did I decide about pricing?", "Summarise my active projects", "What should I focus on this week?", "Which ideas connect to Atlas?"];

/** Retrieval: lexical search over the whole brain, padded with pinned/recent pages. */
export function retrieve(docs: Doc[], question: string, k = 8): Doc[] {
  const hits = search(docs, question, k).map((h) => h.doc);
  if (hits.length < k) {
    // Fall back to per-word search to catch partial matches.
    for (const w of question.split(/\s+/).filter((x) => x.length > 3)) {
      for (const h of search(docs, w, 4)) if (!hits.includes(h.doc)) hits.push(h.doc);
      if (hits.length >= k) break;
    }
  }
  if (hits.length < 3) {
    const recent = [...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const d of recent) if (!hits.includes(d) && hits.length < 6) hits.push(d);
  }
  return hits.slice(0, k);
}

export function AskPanel() {
  const { askOpen, closeAsk, askSeed } = useShell();
  const { data } = useBrain();
  const status = useAIStatus();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const docs = useMemo(() => allDocs(data), [data]);
  const lastSeed = useRef<number | null>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const sources = retrieve(docs, q);
    const context: ContextDoc[] = sources.map((d) => ({ id: d.id, kind: d.kind, title: d.title, body: d.body }));
    const history = turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: "user", content: q }, { role: "assistant", content: "", sources }]);
    setInput("");
    setBusy(true);
    const c = new AbortController();
    ctrl.current = c;
    const update = (patch: Partial<Turn>) => setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, ...patch } : x)));
    try {
      await aiStream({ task: "ask", question: q, context, history }, (full) => update({ content: full }), c.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") update({ error: e instanceof AIError ? e.message : "Network error" });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (askOpen && askSeed && askSeed.n !== lastSeed.current && status?.configured) {
      lastSeed.current = askSeed.n;
      void ask(askSeed.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askOpen, askSeed, status?.configured]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  return (
    <Drawer open={askOpen} onClose={closeAsk} width="max-w-2xl">
      <div className="flex items-center justify-between border-b hairline px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10">
            <span className="absolute inset-0 rounded-xl bg-gold/20 blur-md" />
            <Sparkles className="relative size-4 text-gold" />
          </span>
          <div>
            <p className="text-[15px] font-medium text-fg">Ask your Second Brain</p>
            <p className="text-[12px] text-fg-subtle">Answers grounded in {docs.length} notes{status?.model ? ` · ${status.model}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {turns.length > 0 && (
            <IconButton label="New conversation" onClick={() => (ctrl.current?.abort(), setTurns([]))}>
              <RotateCcw className="size-4" />
            </IconButton>
          )}
          <IconButton label="Close" onClick={closeAsk}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {status && !status.configured && <AINotConfigured />}
        {turns.length === 0 && (
          <div className="pt-6">
            <p className="font-display text-3xl italic text-fg">What would you like to remember?</p>
            <p className="mt-2 text-sm text-fg-muted">I search your pages, ideas, links, projects and conversations, then answer with citations.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  disabled={!status?.configured}
                  onClick={() => ask(s)}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left text-[13.5px] text-fg-muted transition hover:border-gold/25 hover:bg-gold/[0.05] hover:text-fg disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-[14.5px] text-fg">{t.content}</p>
            </div>
          ) : (
            <div key={i} className="space-y-3">
              {t.sources && t.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.sources.map((s, n) => (
                    <a key={s.id} href={s.href} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[11.5px] text-fg-muted hover:border-white/15 hover:text-fg">
                      <span className="font-mono text-[10px] text-gold">{n + 1}</span>
                      <KindIcon kind={s.kind} className="size-3" />
                      <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </div>
              )}
              {t.error ? (
                <p className="rounded-xl border border-rose/20 bg-rose/[0.06] px-4 py-3 text-sm text-rose">{t.error}</p>
              ) : t.content ? (
                <Markdown source={t.content} citations={t.sources?.map((s) => ({ href: s.href, title: s.title }))} className="text-[14.5px]" />
              ) : (
                <AIThinking label="Reading your notes" />
              )}
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="border-t hairline p-4"
      >
        <div className={cn("flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-2 transition focus-within:border-gold/35", !status?.configured && "opacity-50")}>
          <textarea
            data-autofocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            rows={1}
            disabled={!status?.configured}
            placeholder="Ask anything about your notes…"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] text-fg outline-none placeholder:text-fg-faint"
          />
          {busy ? (
            <button type="button" onClick={() => ctrl.current?.abort()} aria-label="Stop" className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-fg hover:bg-white/15">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim() || !status?.configured} aria-label="Send" className="flex size-9 items-center justify-center rounded-xl bg-gold text-ink-950 transition hover:brightness-110 disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </form>
    </Drawer>
  );
}
