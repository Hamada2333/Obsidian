"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MessagesSquare, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import { formatDate, relativeTime } from "@/lib/dates";
import { aiJSON, AIError, useAIStatus } from "@/lib/ai/client";
import type { ConversationSummaryResult } from "@/lib/ai/prompts";
import type { Conversation } from "@/lib/types";
import { uniq } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboInput, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { useFeedback } from "@/components/ui/feedback";
import { AINotConfigured } from "@/components/ai/ai-notice";

const SOURCES = ["Claude", "Meeting", "Call", "Manual"];

function NewConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, actions } = useBrain();
  const { toast } = useFeedback();
  const status = useAIStatus();
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("General");
  const [source, setSource] = useState("Claude");
  const [busy, setBusy] = useState(false);
  const categories = useMemo(() => uniq([...data.conversations.map((c) => c.category), ...data.pages.map((p) => p.category)]), [data]);

  useEffect(() => {
    if (open) {
      setTranscript("");
      setTitle("");
      setSummary("");
      setCategory("General");
    }
  }, [open]);

  const summarize = async () => {
    setBusy(true);
    try {
      const r = await aiJSON<ConversationSummaryResult>({ task: "summarize-conversation", transcript, categories });
      setTitle(r.title);
      setSummary(r.summary);
      setCategory(r.category);
    } catch (e) {
      toast({ tone: "error", title: "Couldn't summarise", description: e instanceof AIError ? e.message : "Network error" });
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    actions.createConversation({ title: title.trim(), summary: summary.trim(), category: category.trim() || "General", source, transcript: transcript.trim() || undefined });
    toast({ title: "Conversation saved", description: title });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a conversation"
      description="Paste a transcript or chat and let AI distil it — or write the summary yourself."
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!title.trim() || !summary.trim()} onClick={save}>
            Save summary
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Transcript" hint="optional">
          <Textarea data-autofocus rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste a chat, meeting notes or call transcript…" />
        </Field>
        {status && !status.configured ? (
          <AINotConfigured compact />
        ) : (
          <Button size="sm" icon={<Wand2 className="size-3.5" />} loading={busy} disabled={transcript.trim().length < 40} onClick={summarize}>
            Summarise with AI
          </Button>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pricing strategy call" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <ComboInput id="conv-cat" options={categories} value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="Source">
              <ComboInput id="conv-src" options={SOURCES} value={source} onChange={(e) => setSource(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Summary">
          <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Decisions, conclusions and next steps…" />
        </Field>
      </div>
    </Modal>
  );
}

function ConversationDetail({ conv, onClose }: { conv: Conversation | null; onClose: () => void }) {
  const { actions } = useBrain();
  const { confirm, toast } = useFeedback();
  return (
    <Modal
      open={!!conv}
      onClose={onClose}
      title={conv?.title}
      description={conv ? `${conv.source} · ${formatDate(conv.date, { month: "long", day: "numeric", year: "numeric" })}` : undefined}
      className="sm:max-w-2xl"
      footer={
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="size-3.5" />}
          onClick={async () => {
            if (!conv) return;
            if (await confirm({ title: "Delete this conversation?", description: "This cannot be undone.", confirmLabel: "Delete", danger: true })) {
              actions.deleteConversation(conv.id);
              toast({ title: "Conversation deleted" });
              onClose();
            }
          }}
        >
          Delete
        </Button>
      }
    >
      {conv && (
        <div className="space-y-4">
          <Badge accent="rose">{conv.category}</Badge>
          <p className="text-[15px] leading-relaxed text-fg">{conv.summary}</p>
          {conv.transcript && (
            <details className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <summary className="cursor-pointer text-sm text-fg-muted">Transcript</summary>
              <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg-muted">{conv.transcript}</pre>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ConversationSummaries() {
  const { data } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const [adding, setAdding] = useState(false);
  const openId = params.get("conversation");
  const open = data.conversations.find((c) => c.id === openId) ?? null;
  const list = [...data.conversations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <section id="conversations" className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-medium text-fg">
            <Sparkles className="size-4 text-rose" /> Recent conversation summaries
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-subtle">AI-distilled records of chats, calls and meetings</p>
        </div>
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
          Add
        </Button>
      </div>
      {list.length === 0 ? (
        <button onClick={() => setAdding(true)} className="flex w-full flex-col items-center rounded-3xl border border-dashed border-white/10 py-10 text-sm text-fg-subtle hover:border-white/20 hover:text-fg-muted">
          <MessagesSquare className="mb-2 size-5" />
          Record your first conversation
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.5 }}
              onClick={() => router.replace(`/?conversation=${c.id}`, { scroll: false })}
              className="glass group flex flex-col rounded-3xl p-5 text-left transition hover:border-white/[0.14] hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge accent="rose">{c.category}</Badge>
                <span className="text-[11.5px] text-fg-faint">{relativeTime(c.date)}</span>
              </div>
              <p className="mt-3.5 text-[15px] font-medium text-fg">{c.title}</p>
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-fg-muted">{c.summary}</p>
              <p className="mt-auto pt-4 text-[11.5px] text-fg-faint">
                {c.source} · {formatDate(c.date)}
              </p>
            </motion.button>
          ))}
        </div>
      )}
      <NewConversation open={adding} onClose={() => setAdding(false)} />
      <ConversationDetail conv={open} onClose={() => router.replace("/", { scroll: false })} />
    </section>
  );
}
