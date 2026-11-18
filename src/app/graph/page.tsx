"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Expand, Minus, Pause, Play, Plus, RotateCcw, Search, X } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import type { EntityKind } from "@/lib/types";
import { buildEdges } from "@/lib/graph";
import { docPreview } from "@/lib/entities";
import { relativeTime } from "@/lib/dates";
import { cn, KIND_LABEL } from "@/lib/utils";
import { KnowledgeGraph, NODE_COLOR, type GNode, type GraphControls } from "@/components/graph/knowledge-graph";
import { Button, IconButton } from "@/components/ui/button";

const KINDS: EntityKind[] = ["page", "idea", "link", "project"];

function GraphView() {
  const { data } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const [kinds, setKinds] = useState<Set<EntityKind>>(new Set(KINDS));
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<GNode | null>(null);
  const [paused, setPaused] = useState(data.preferences.reducedMotion);
  const controls = useRef<GraphControls | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const focusId = params.get("focus");

  const edgeCount = useMemo(() => buildEdges(data).length, [data]);
  const counts = useMemo(
    () => ({
      page: data.pages.filter((x) => !x.archived).length,
      idea: data.ideas.filter((x) => !x.archived).length,
      link: data.links.filter((x) => !x.archived).length,
      project: data.projects.filter((x) => !x.archived).length,
    }),
    [data],
  );

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => controls.current?.focus(focusId), 900);
    return () => clearTimeout(t);
  }, [focusId]);

  const onSelect = useCallback((n: GNode | null) => setSelected(n), []);
  const onOpen = useCallback((n: GNode) => n.doc && router.push(n.doc.href), [router]);

  const toggleKind = (k: EntityKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k);
      } else next.add(k);
      return next;
    });

  return (
    <div ref={wrap} className="relative -mx-4 -mb-24 -mt-8 h-[calc(100dvh-72px)] overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(232,184,107,0.06),transparent_60%)] md:-mx-8 md:-mt-12">
      <KnowledgeGraph data={data} kinds={kinds} highlight={q} selectedId={selected?.id ?? null} onSelect={onSelect} onOpen={onOpen} controls={controls} paused={paused} />

      {/* Header overlay */}
      <div className="pointer-events-none absolute left-4 top-6 max-w-sm md:left-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pointer-events-auto">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold/80">Knowledge connections</p>
          <h1 className="mt-2 font-display text-[40px] leading-none text-fg">The map of your mind</h1>
          <p className="mt-3 text-[13px] text-fg-muted">
            {counts.page + counts.idea + counts.link + counts.project} nodes · {edgeCount} connections. Drag to explore, scroll to zoom, double-click to open.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                aria-pressed={kinds.has(k)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] backdrop-blur-md transition",
                  kinds.has(k) ? "border-white/15 bg-white/[0.07] text-fg" : "border-white/[0.06] bg-black/30 text-fg-faint",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: kinds.has(k) ? NODE_COLOR[k] : "#45444f" }} />
                {KIND_LABEL[k]}s <span className="opacity-60">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-3 w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Highlight nodes…"
              aria-label="Highlight nodes"
              className="h-9 w-full rounded-xl border border-white/[0.08] bg-black/40 pl-8 pr-3 text-[13px] text-fg outline-none backdrop-blur-md placeholder:text-fg-faint focus:border-gold/35"
            />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="glass absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl p-1">
        <IconButton label="Zoom out" onClick={() => controls.current?.zoomBy(0.75)}>
          <Minus className="size-4" />
        </IconButton>
        <IconButton label="Zoom in" onClick={() => controls.current?.zoomBy(1.33)}>
          <Plus className="size-4" />
        </IconButton>
        <IconButton label="Reset view" onClick={() => (controls.current?.reset(), controls.current?.reheat())}>
          <RotateCcw className="size-4" />
        </IconButton>
        <IconButton label={paused ? "Resume motion" : "Pause motion"} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </IconButton>
        <IconButton label="Fullscreen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())}>
          <Expand className="size-4" />
        </IconButton>
      </div>

      {/* Selection panel */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute right-4 top-6 w-[min(340px,calc(100%-2rem))] rounded-3xl p-5 md:right-8"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em]" style={{ color: NODE_COLOR[selected.kind] }}>
                {selected.kind === "hub" ? "Cluster" : KIND_LABEL[selected.kind as EntityKind]} · {selected.degree} {selected.kind === "hub" ? "items" : "connections"}
              </p>
              <IconButton label="Close" size="sm" onClick={() => setSelected(null)}>
                <X className="size-3.5" />
              </IconButton>
            </div>
            <h2 className="mt-2 text-[19px] font-medium leading-snug text-fg">{selected.title}</h2>
            {selected.doc && (
              <>
                <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-fg-muted">{docPreview(selected.doc, 220) || "No content yet."}</p>
                <p className="mt-3 text-[11.5px] text-fg-faint">
                  {selected.doc.category} · updated {relativeTime(selected.doc.updatedAt)}
                </p>
                <Link href={selected.doc.href}>
                  <Button variant="primary" size="sm" className="mt-4 w-full" iconRight={<ArrowUpRight className="size-3.5" />}>
                    Open {KIND_LABEL[selected.kind as EntityKind].toLowerCase()}
                  </Button>
                </Link>
              </>
            )}
            {selected.kind === "hub" && selected.hubKind === "page" && (
              <Link href={`/pages?category=${encodeURIComponent(selected.title)}`}>
                <Button size="sm" className="mt-4 w-full" iconRight={<ArrowUpRight className="size-3.5" />}>
                  Browse {selected.title}
                </Button>
              </Link>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

const Gated = withBrain(GraphView);
export default function GraphRoute() {
  return (
    <Suspense>
      <Gated />
    </Suspense>
  );
}
