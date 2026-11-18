"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Columns3, CornerDownLeft, Lightbulb, List, Orbit, Plus } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { IDEA_STATUSES, type Idea, type IdeaStatus } from "@/lib/types";
import { relativeTime } from "@/lib/dates";
import { allDocs } from "@/lib/entities";
import { search } from "@/lib/search";
import { cn, uniq } from "@/lib/utils";
import { Badge, Kbd, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { Chips, FilterSearch } from "@/components/common/filter-bar";
import { IdeaDrawer, STATUS_META } from "@/components/ideas/idea-drawer";

function QuickCapture({ onCreated, autoFocus }: { onCreated: (i: Idea) => void; autoFocus: boolean }) {
  const { data, actions } = useBrain();
  const { toast } = useFeedback();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => uniq(data.ideas.map((i) => i.category)), [data.ideas]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const save = (open = false) => {
    if (!title.trim()) return;
    // Inline #tags in the title become tags.
    const tags = [...title.matchAll(/#([\w-]+)/g)].map((m) => m[1].toLowerCase());
    const clean = title.replace(/#[\w-]+/g, "").replace(/\s+/g, " ").trim();
    const idea = actions.createIdea({ title: clean, description: desc.trim(), category: category.trim() || "General", tags });
    toast({ title: "Idea captured", description: clean, action: open ? undefined : { label: "Open", onClick: () => onCreated(idea) } });
    setTitle("");
    setDesc("");
    if (open) onCreated(idea);
    ref.current?.focus();
  };

  return (
    <motion.div layout className="glass relative mb-8 overflow-hidden rounded-3xl">
      <div className="pointer-events-none absolute -left-10 -top-16 h-32 w-64 rounded-full bg-gold/10 blur-3xl" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="relative"
      >
        <div className="flex items-center gap-3 px-5">
          <Lightbulb className="size-5 shrink-0 text-gold" />
          <input
            ref={ref}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save(true);
              }
            }}
            placeholder="Capture an idea… (use #tags inline)"
            aria-label="New idea"
            className="h-16 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-faint"
          />
          <span className="hidden items-center gap-1 text-[11px] text-fg-faint sm:flex">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>
            save
          </span>
          <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
            Capture
          </Button>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-col gap-3 border-t hairline px-5 py-3 sm:flex-row">
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Add a short description (optional)"
                  aria-label="Description"
                  className="h-9 flex-1 bg-transparent text-[13.5px] text-fg-muted outline-none placeholder:text-fg-faint"
                />
                <input
                  list="idea-cats"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  aria-label="Category"
                  className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-[13px] text-fg outline-none placeholder:text-fg-faint focus:border-gold/30 sm:w-44"
                />
                <datalist id="idea-cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}

function IdeaCard({ idea, onOpen, draggable }: { idea: Idea; onOpen: () => void; draggable?: boolean }) {
  const { data } = useBrain();
  const project = idea.projectId ? data.projects.find((p) => p.id === idea.projectId) : null;
  return (
    <motion.div
      layout
      layoutId={`idea-${idea.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
    {/* Native HTML5 drag lives on a plain element (motion components own onDrag* props). */}
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/idea", idea.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className="group w-full cursor-pointer rounded-2xl border border-white/[0.07] bg-ink-850/80 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-white/[0.15] hover:bg-ink-800 active:cursor-grabbing"
    >
      <p className="text-[14px] font-medium leading-snug text-fg">{idea.title || "Untitled idea"}</p>
      {idea.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-fg-muted">{idea.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge accent="gold">{idea.category}</Badge>
        {idea.tags.slice(0, 2).map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
        {project && (
          <span className="inline-flex items-center gap-1 text-[11px] text-violet">
            <Orbit className="size-3" /> project
          </span>
        )}
        <span className="ml-auto text-[11px] text-fg-faint">{relativeTime(idea.updatedAt)}</span>
      </div>
    </div>
    </motion.div>
  );
}

function Board({ ideas, onOpen }: { ideas: Idea[]; onOpen: (id: string) => void }) {
  const { actions } = useBrain();
  const [over, setOver] = useState<IdeaStatus | null>(null);
  const cols = IDEA_STATUSES.filter((s) => s !== "archived");
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
      {cols.map((s) => {
        const list = ideas.filter((i) => i.status === s);
        return (
          <section
            key={s}
            aria-label={STATUS_META[s].label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/idea");
              if (id) actions.updateIdea(id, { status: s });
            }}
            className={cn(
              "flex min-h-[320px] w-[280px] shrink-0 flex-col rounded-3xl border p-3 transition-colors md:w-auto",
              over === s ? "border-gold/30 bg-gold/[0.04]" : "border-white/[0.05] bg-white/[0.015]",
            )}
          >
            <header className="mb-3 flex items-center justify-between px-1.5 pt-1">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg-muted">
                <span className="size-2 rounded-full" style={{ background: STATUS_META[s].dot, boxShadow: `0 0 10px ${STATUS_META[s].dot}` }} />
                {STATUS_META[s].label}
              </span>
              <span className="text-[11.5px] tabular-nums text-fg-faint">{list.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {list.map((i) => (
                  <IdeaCard key={i.id} idea={i} onOpen={() => onOpen(i.id)} draggable />
                ))}
              </AnimatePresence>
              {list.length === 0 && <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/[0.06] py-8 text-[12px] text-fg-faint">Drop ideas here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IdeasView() {
  const { data } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [status, setStatus] = useState<IdeaStatus | null>(null);
  const category = params.get("category");
  const openId = params.get("open");
  const isNew = params.get("new") === "1";

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete("new");
    router.replace(`/ideas${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const live = useMemo(() => data.ideas.filter((i) => !i.archived), [data.ideas]);
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of live) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);
  const tags = useMemo(() => uniq(live.flatMap((i) => i.tags)).sort(), [live]);

  const ideas = useMemo(() => {
    let list = live;
    if (category) list = list.filter((i) => i.category === category);
    if (tag) list = list.filter((i) => i.tags.includes(tag));
    if (status && view === "list") list = list.filter((i) => i.status === status);
    if (q.trim()) {
      const ids = new Set(list.map((i) => i.id));
      const order = search(allDocs(data).filter((d) => ids.has(d.id)), q, 300).map((h) => h.doc.id);
      return order.map((id) => list.find((i) => i.id === id)!);
    }
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [live, category, tag, status, view, q, data]);

  const open = data.ideas.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <PageHeader eyebrow="Capture" title="Ideas" description="Catch sparks the moment they appear, let them mature, and promote the best into projects." />
      <QuickCapture autoFocus={isNew} onCreated={(i) => setParam("open", i.id)} />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearch value={q} onChange={setQ} placeholder="Filter ideas…" />
          {tags.length > 0 && (
            <div className="w-36">
              <Select value={tag ?? ""} onChange={(e) => setTag(e.target.value || null)} aria-label="Filter by tag" className="h-9 text-[13px]">
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {view === "list" && (
            <div className="w-36">
              <Select value={status ?? ""} onChange={(e) => setStatus((e.target.value as IdeaStatus) || null)} aria-label="Filter by status" className="h-9 text-[13px]">
                <option value="">All statuses</option>
                {IDEA_STATUSES.filter((s) => s !== "archived").map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Segmented
            className="ml-auto"
            value={view}
            onChange={setView}
            options={[
              { value: "board", label: <Columns3 className="size-3.5" />, title: "Board" },
              { value: "list", label: <List className="size-3.5" />, title: "List" },
            ]}
          />
        </div>
        <Chips value={category} onChange={(v) => setParam("category", v)} options={cats.map(([c, n]) => ({ value: c, label: c, count: n }))} allLabel="All ideas" />
      </div>

      {live.length === 0 ? (
        <EmptyState icon={<Lightbulb className="size-6" />} title="No ideas yet" description="Type above and press Enter — capturing should take two seconds." />
      ) : view === "board" ? (
        <Board ideas={ideas} onOpen={(id) => setParam("open", id)} />
      ) : (
        <div className="glass rounded-3xl p-2">
          {ideas.length === 0 && <p className="py-10 text-center text-sm text-fg-subtle">No ideas match these filters.</p>}
          <AnimatePresence mode="popLayout">
            {ideas.map((i) => (
              <motion.button
                layout
                key={i.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setParam("open", i.id)}
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-white/[0.03]"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_META[i.status].dot }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] text-fg">{i.title}</span>
                  <span className="block truncate text-[12.5px] text-fg-subtle">{i.description || "No description"}</span>
                </span>
                <span className={cn("hidden w-24 shrink-0 text-[12px] sm:block", STATUS_META[i.status].color)}>{STATUS_META[i.status].label}</span>
                <span className="hidden shrink-0 md:block">
                  <Badge accent="gold">{i.category}</Badge>
                </span>
                <span className="w-16 shrink-0 text-right text-[12px] text-fg-faint">{relativeTime(i.updatedAt)}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="sm" icon={<Plus className="size-3.5" />} onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="New idea"]')?.focus()}>
          New idea
        </Button>
      </div>

      <IdeaDrawer idea={open} onClose={() => setParam("open", null)} />
    </div>
  );
}

const Gated = withBrain(IdeasView);
export default function IdeasRoute() {
  return (
    <Suspense>
      <Gated />
    </Suspense>
  );
}
