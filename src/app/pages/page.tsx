"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Archive, FileText, LayoutGrid, List, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { allDocs } from "@/lib/entities";
import { search } from "@/lib/search";
import { buildEdges, degreeMap } from "@/lib/graph";
import { relativeTime } from "@/lib/dates";
import { cn, excerpt, uniq } from "@/lib/utils";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, Tag } from "@/components/ui/badge";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/surface";
import { Select } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { Chips, FilterSearch } from "@/components/common/filter-bar";
import { DropMenu } from "@/components/common/entity-menu";

type Sort = "updated" | "created" | "title" | "connected";

function PageCard({ page, view, degree, index }: { page: Page; view: "grid" | "list"; degree: number; index: number }) {
  const { actions } = useBrain();
  const { confirm, toast } = useFeedback();
  const menu = [
    { label: page.pinned ? "Unpin" : "Pin", icon: page.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />, onSelect: () => actions.updatePage(page.id, { pinned: !page.pinned }) },
    {
      label: "Archive",
      icon: <Archive className="size-3.5" />,
      onSelect: () => {
        actions.setArchived("page", page.id, true);
        toast({ title: "Page archived", description: page.title, action: { label: "Undo", onClick: () => actions.setArchived("page", page.id, false) } });
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      onSelect: async () => {
        if (await confirm({ title: `Delete “${page.title || "Untitled"}”?`, description: "This permanently removes the page and its connections.", confirmLabel: "Delete", danger: true })) {
          actions.deleteEntity("page", page.id);
          toast({ title: "Page deleted" });
        }
      },
    },
  ];

  if (view === "list") {
    return (
      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
        <Link href={`/pages/${page.id}`} className="group flex items-center gap-4 rounded-2xl border border-transparent px-4 py-3 transition hover:border-white/[0.07] hover:bg-white/[0.03]">
          <FileText className="size-4 shrink-0 text-blue/80" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[14.5px] text-fg">{page.title || "Untitled"}</span>
              {page.pinned && <Pin className="size-3 shrink-0 fill-gold text-gold" />}
            </span>
            <span className="block truncate text-[12.5px] text-fg-subtle">{excerpt(page.content, 120) || "Empty page"}</span>
          </span>
          <span className="hidden shrink-0 md:block">
            <Badge>{page.category}</Badge>
          </span>
          <span className="hidden w-20 shrink-0 text-right text-[12px] tabular-nums text-fg-faint sm:block">{degree} links</span>
          <span className="w-16 shrink-0 text-right text-[12px] text-fg-faint">{relativeTime(page.updatedAt)}</span>
          <DropMenu items={menu} />
        </Link>
      </motion.div>
    );
  }
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.025, ease: [0.16, 1, 0.3, 1] }}>
      <Link href={`/pages/${page.id}`} className="glass group relative flex h-full flex-col rounded-3xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14]">
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue/0 to-transparent transition group-hover:via-blue/60" />
        <div className="flex items-start justify-between gap-2">
          <Badge accent="blue">{page.category}</Badge>
          <div className="-mr-2 -mt-1 flex items-center">
            {page.pinned && <Pin className="mr-1 size-3.5 fill-gold text-gold" />}
            <DropMenu items={menu} />
          </div>
        </div>
        <h3 className="mt-4 text-[17px] font-medium leading-snug tracking-[-0.01em] text-fg">{page.title || "Untitled"}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-fg-muted">{excerpt(page.content, 200) || "Empty page"}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
          {page.tags.slice(0, 3).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          <span className="ml-auto text-[11.5px] text-fg-faint">
            {degree > 0 && `${degree} links · `}
            {relativeTime(page.updatedAt)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function PagesView() {
  const { data, actions } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tag, setTag] = useState<string | null>(null);
  const category = params.get("category");
  const sort = (params.get("sort") as Sort) || "updated";
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`/pages${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const live = useMemo(() => data.pages.filter((p) => !p.archived), [data.pages]);
  const degrees = useMemo(() => degreeMap(buildEdges(data)), [data]);
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of live) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);
  const tags = useMemo(() => uniq(live.flatMap((p) => p.tags)).sort(), [live]);

  const pages = useMemo(() => {
    let list = live;
    if (category) list = list.filter((p) => p.category === category);
    if (tag) list = list.filter((p) => p.tags.includes(tag));
    if (q.trim()) {
      const ids = new Set(list.map((p) => p.id));
      const order = search(allDocs(data).filter((d) => ids.has(d.id)), q, 200).map((h) => h.doc.id);
      return order.map((id) => list.find((p) => p.id === id)!);
    }
    const sorted = [...list];
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "created") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "connected") sorted.sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0));
    else sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sorted;
  }, [live, category, tag, q, sort, data, degrees]);

  const pinned = !q && pages.filter((p) => p.pinned);
  const rest = pinned ? pages.filter((p) => !p.pinned) : pages;

  const create = () => {
    const p = actions.createPage({ category: category ?? "Reference notes" });
    router.push(`/pages/${p.id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge"
        title="Pages"
        description="Long-form notes, plans, decisions and references — linked together with [[wiki links]]."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={create}>
            New page
          </Button>
        }
      />
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearch value={q} onChange={setQ} placeholder="Filter pages…" />
          <div className="w-40">
            <Select value={sort} onChange={(e) => setParam("sort", e.target.value === "updated" ? null : e.target.value)} aria-label="Sort pages" className="h-9 text-[13px]">
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
              <option value="title">Title A–Z</option>
              <option value="connected">Most connected</option>
            </Select>
          </div>
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
          <Segmented
            className="ml-auto"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: <LayoutGrid className="size-3.5" />, title: "Grid view" },
              { value: "list", label: <List className="size-3.5" />, title: "List view" },
            ]}
          />
        </div>
        <Chips value={category} onChange={(v) => setParam("category", v)} options={categories.map(([c, n]) => ({ value: c, label: c, count: n }))} allLabel="All pages" />
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title={q || category || tag ? "No pages match these filters" : "Your first page awaits"}
          description={q || category || tag ? "Try a different search or clear filters." : "Pages hold your long-form thinking. Link them with [[double brackets]]."}
          action={
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={create}>
              New page
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {pinned && pinned.length > 0 && (
            <section>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                <Pin className="size-3 text-gold" /> Pinned
              </p>
              <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "glass rounded-3xl p-2")}>
                <AnimatePresence mode="popLayout">
                  {pinned.map((p, i) => (
                    <PageCard key={p.id} page={p} view={view} degree={degrees.get(p.id) ?? 0} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
          <section>
            {pinned && pinned.length > 0 && <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle">All pages · {rest.length}</p>}
            <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "glass rounded-3xl p-2")}>
              <AnimatePresence mode="popLayout">
                {rest.map((p, i) => (
                  <PageCard key={p.id} page={p} view={view} degree={degrees.get(p.id) ?? 0} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const Gated = withBrain(PagesView);
export default function PagesRoute() {
  return (
    <Suspense>
      <Gated />
    </Suspense>
  );
}
