"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CornerDownLeft, FilePlus2, Lightbulb, Link2, Orbit, Search, Settings, Sparkles, Waypoints } from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import { allDocs } from "@/lib/entities";
import { search } from "@/lib/search";
import { relativeTime } from "@/lib/dates";
import { KIND_LABEL, cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/badge";
import { KindIcon } from "./kind-icon";
import { useShell } from "./shell-context";
import { NAV } from "./top-nav";

interface Item {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  meta?: string;
  run: () => void;
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const alt = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${alt})`, "ig");
  const exact = new RegExp(`^(?:${alt})$`, "i");
  return (
    <>
      {text.split(re).map((part, i) =>
        exact.test(part) ? (
          <mark key={i} className="rounded-sm bg-gold/20 px-0.5 text-gold-soft">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openAsk } = useShell();
  const { data, actions } = useBrain();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [paletteOpen]);

  const close = () => setPaletteOpen(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const docs = useMemo(() => allDocs(data), [data]);
  const hits = useMemo(() => search(docs, q, 14), [docs, q]);
  const terms = hits[0]?.matches ?? [];

  const items: Item[] = useMemo(() => {
    const list: Item[] = [];
    const query = q.trim();
    if (query) {
      list.push({
        id: "ask",
        group: "AI",
        title: `Ask your Second Brain: “${query}”`,
        subtitle: "Answer from your notes with citations",
        icon: <Sparkles className="size-4 text-gold" />,
        run: () => openAsk(query),
      });
      for (const h of hits)
        list.push({
          id: h.doc.id,
          group: "Results",
          title: h.doc.title,
          subtitle: h.snippet,
          icon: <KindIcon kind={h.doc.kind} />,
          meta: `${KIND_LABEL[h.doc.kind]} · ${relativeTime(h.doc.updatedAt)}`,
          run: () => go(h.doc.href),
        });
    }
    const create: Item[] = [
      {
        id: "new-page",
        group: "Create",
        title: query ? `New page “${query}”` : "New page",
        icon: <FilePlus2 className="size-4 text-blue" />,
        meta: "N",
        run: () => {
          const p = actions.createPage({ title: query });
          go(`/pages/${p.id}`);
        },
      },
      {
        id: "new-idea",
        group: "Create",
        title: query ? `Capture idea “${query}”` : "Capture idea",
        icon: <Lightbulb className="size-4 text-gold" />,
        run: () => {
          if (query) {
            const i = actions.createIdea({ title: query });
            go(`/ideas?open=${i.id}`);
          } else go("/ideas?new=1");
        },
      },
      { id: "new-link", group: "Create", title: "Save a link", icon: <Link2 className="size-4 text-emerald" />, run: () => go("/links?new=1") },
      { id: "new-project", group: "Create", title: "New project", icon: <Orbit className="size-4 text-violet" />, run: () => go("/projects?new=1") },
    ];
    const nav: Item[] = NAV.map((n) => ({
      id: `nav-${n.href}`,
      group: "Go to",
      title: n.label,
      icon: n.href === "/graph" ? <Waypoints className="size-4 text-fg-subtle" /> : n.href === "/settings" ? <Settings className="size-4 text-fg-subtle" /> : <ArrowRight className="size-4 text-fg-subtle" />,
      run: () => go(n.href),
    }));
    if (!query) {
      const recent = [...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
      list.push(
        {
          id: "ask-empty",
          group: "AI",
          title: "Ask your Second Brain",
          subtitle: "Chat with everything you've saved",
          icon: <Sparkles className="size-4 text-gold" />,
          meta: "⌘J",
          run: () => openAsk(),
        },
        ...recent.map((d) => ({
          id: `recent-${d.id}`,
          group: "Recent",
          title: d.title,
          icon: <KindIcon kind={d.kind} />,
          meta: relativeTime(d.updatedAt),
          run: () => go(d.href),
        })),
        ...create,
        ...nav,
      );
    } else {
      list.push(...create.slice(0, 2), ...nav.filter((n) => n.title.toLowerCase().includes(query.toLowerCase())));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hits, docs]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[sel]?.run();
    } else if (e.key === "Escape") close();
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {paletteOpen && (
        <div className="fixed inset-0 z-[90] flex justify-center px-4 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -16, scale: 0.98, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.99, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong relative flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
            onKeyDown={onKey}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative flex items-center gap-3 border-b hairline px-5">
              <Search className="size-[18px] text-gold/80" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search every page and conversation…"
                className="h-16 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-faint"
                aria-controls="palette-list"
                aria-activedescendant={items[sel] ? `pi-${items[sel].id}` : undefined}
              />
              <Kbd>Esc</Kbd>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="relative flex-1 overflow-y-auto p-2">
              {q.trim() && hits.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-fg-subtle">No exact matches — ask AI or create something new.</p>
              )}
              {items.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                return (
                  <div key={it.id}>
                    {header && <p className="px-3 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-fg-faint">{header}</p>}
                    <button
                      id={`pi-${it.id}`}
                      role="option"
                      aria-selected={i === sel}
                      data-index={i}
                      onMouseMove={() => setSel(i)}
                      onClick={() => it.run()}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", i === sel ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">{it.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-fg">
                          <Highlight text={it.title} terms={it.group === "Results" ? terms : []} />
                        </span>
                        {it.subtitle && (
                          <span className="mt-0.5 block truncate text-[12.5px] text-fg-subtle">
                            <Highlight text={it.subtitle} terms={it.group === "Results" ? terms : []} />
                          </span>
                        )}
                      </span>
                      {it.meta && <span className="shrink-0 text-[11.5px] text-fg-faint">{it.meta}</span>}
                      {i === sel && <CornerDownLeft className="size-3.5 shrink-0 text-fg-subtle" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t hairline px-5 py-2.5 text-[11.5px] text-fg-faint">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto">{docs.length.toLocaleString()} items indexed</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
