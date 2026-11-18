"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, Orbit, RotateCcw, Trash2, X } from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import { IDEA_STATUSES, type Idea, type IdeaStatus } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/dates";
import { allDocs } from "@/lib/entities";
import { relatedDocs } from "@/lib/similarity";
import { cn, uniq } from "@/lib/utils";
import { Drawer } from "@/components/ui/overlay";
import { Button, IconButton } from "@/components/ui/button";
import { ComboInput, Field, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { useFeedback } from "@/components/ui/feedback";
import { ConnectionsPanel } from "@/components/connections";
import { AICategorize, AIStreamCard } from "@/components/ai/ai-actions";

export const STATUS_META: Record<IdeaStatus, { label: string; color: string; dot: string }> = {
  inbox: { label: "Inbox", color: "text-[#9ccbff]", dot: "#5aa9ff" },
  thinking: { label: "Thinking", color: "text-gold-soft", dot: "#e8b86b" },
  "in-progress": { label: "In progress", color: "text-[#c9b8ff]", dot: "#a78bfa" },
  completed: { label: "Completed", color: "text-[#86efc1]", dot: "#3ddc97" },
  archived: { label: "Archived", color: "text-fg-subtle", dot: "#6b6a78" },
};

export function StatusPicker({ value, onChange }: { value: IdeaStatus; onChange: (s: IdeaStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
      {IDEA_STATUSES.map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition",
            value === s ? "border-white/20 bg-white/[0.08] text-fg" : "border-white/[0.06] text-fg-subtle hover:text-fg-muted",
          )}
        >
          <span className="size-1.5 rounded-full" style={{ background: STATUS_META[s].dot }} />
          {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}

export function IdeaDrawer({ idea, onClose }: { idea: Idea | null; onClose: () => void }) {
  const { data, actions } = useBrain();
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const id = idea?.id;

  useEffect(() => {
    setTitle(idea?.title ?? "");
    setDesc(idea?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!idea || (title === idea.title && desc === idea.description)) return;
    const t = setTimeout(() => actions.updateIdea(idea.id, { title, description: desc }), 350);
    return () => clearTimeout(t);
  }, [title, desc, idea, actions]);

  const categories = useMemo(() => uniq(data.ideas.map((i) => i.category)), [data.ideas]);
  const tags = useMemo(() => uniq(data.ideas.flatMap((i) => i.tags)), [data.ideas]);
  const project = idea?.projectId ? data.projects.find((p) => p.id === idea.projectId) : undefined;

  return (
    <Drawer open={!!idea} onClose={onClose}>
      {idea && (
        <>
          <div className="flex items-center justify-between border-b hairline px-6 py-4">
            <p className="text-[12px] text-fg-subtle">
              Idea · captured {formatDate(idea.createdAt, { month: "short", day: "numeric", year: "numeric" })} · edited {relativeTime(idea.updatedAt)}
            </p>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <textarea
              data-autofocus
              value={title}
              rows={1}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
              placeholder="Name your idea"
              aria-label="Idea title"
              className="w-full resize-none bg-transparent font-display text-[34px] leading-tight text-fg outline-none placeholder:text-fg-faint"
            />
            <StatusPicker value={idea.status} onChange={(s) => actions.updateIdea(idea.id, { status: s })} />
            <Field label="Description">
              <Textarea autoGrow rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's the idea? Why does it matter?" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <ComboInput id="idea-cat" options={categories} value={idea.category} onChange={(e) => actions.updateIdea(idea.id, { category: e.target.value })} />
              </Field>
              <Field label="Tags">
                <TagInput value={idea.tags} onChange={(t) => actions.updateIdea(idea.id, { tags: t })} suggestions={tags} />
              </Field>
            </div>
            <AICategorize
              request={() => ({ task: "categorize", title, content: desc, categories, tags })}
              onApply={(r) => actions.updateIdea(idea.id, { category: r.category, tags: uniq([...idea.tags, ...r.tags]) })}
            />

            {project ? (
              <button onClick={() => router.push(`/projects/${project.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-violet/25 bg-violet/[0.06] p-4 text-left transition hover:bg-violet/[0.1]">
                <Orbit className="size-5 text-violet" />
                <span className="flex-1">
                  <span className="block text-[12px] text-fg-subtle">Became a project</span>
                  <span className="block text-sm text-fg">{project.title}</span>
                </span>
                <ArrowRight className="size-4 text-fg-subtle" />
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div>
                  <p className="text-sm text-fg">Ready to make it real?</p>
                  <p className="text-[12.5px] text-fg-subtle">Turn this idea into a tracked project.</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Orbit className="size-3.5" />}
                  onClick={() => {
                    const p = actions.convertIdeaToProject(idea.id);
                    if (p) {
                      toast({ title: "Project created", description: p.title });
                      onClose();
                      router.push(`/projects/${p.id}`);
                    }
                  }}
                >
                  Convert
                </Button>
              </div>
            )}

            <AIStreamCard
              title="Expand with AI"
              cta="Expand this idea"
              saveLabel="Append to description"
              request={() => ({
                task: "expand-idea",
                title,
                description: desc,
                related: relatedDocs(allDocs(data), idea.id, 3).map((r) => ({ id: r.doc.id, kind: r.doc.kind, title: r.doc.title, body: r.doc.body })),
              })}
              onSave={(text) => {
                const next = `${desc.trim()}\n\n${text.trim()}`.trim();
                setDesc(next);
                toast({ title: "Added to description" });
              }}
            />

            <div className="glass rounded-3xl p-5">
              <ConnectionsPanel id={idea.id} kind="idea" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t hairline px-6 py-4">
            {idea.archived ? (
              <Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => actions.setArchived("idea", idea.id, false)}>
                Restore
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={<Archive className="size-3.5" />}
                onClick={() => {
                  actions.setArchived("idea", idea.id, true);
                  toast({ title: "Idea archived", action: { label: "Undo", onClick: () => actions.setArchived("idea", idea.id, false) } });
                  onClose();
                }}
              >
                Archive
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              className="ml-auto"
              icon={<Trash2 className="size-3.5" />}
              onClick={async () => {
                if (await confirm({ title: "Delete this idea?", description: "This cannot be undone.", confirmLabel: "Delete", danger: true })) {
                  actions.deleteEntity("idea", idea.id);
                  toast({ title: "Idea deleted" });
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
