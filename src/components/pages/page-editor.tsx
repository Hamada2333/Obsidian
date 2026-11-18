"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Bold,
  Code,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  PenLine,
  Pin,
  Quote,
  SquareCheck,
  Trash2,
} from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import type { Page } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/dates";
import { cn, uniq } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ComboInput, Field } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { Segmented } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { DropMenu } from "@/components/common/entity-menu";
import { ConnectionsPanel } from "@/components/connections";
import { AICategorize, AIStreamCard } from "@/components/ai/ai-actions";

type Mode = "write" | "preview" | "split";

const TOOLS = [
  { icon: Heading1, label: "Heading 1", kind: "line", value: "# " },
  { icon: Heading2, label: "Heading 2", kind: "line", value: "## " },
  { icon: Bold, label: "Bold (⌘B)", kind: "wrap", value: "**" },
  { icon: Italic, label: "Italic (⌘I)", kind: "wrap", value: "*" },
  { icon: Code, label: "Inline code", kind: "wrap", value: "`" },
  { icon: List, label: "Bulleted list", kind: "line", value: "- " },
  { icon: ListOrdered, label: "Numbered list", kind: "line", value: "1. " },
  { icon: SquareCheck, label: "Checklist", kind: "line", value: "- [ ] " },
  { icon: Quote, label: "Quote", kind: "line", value: "> " },
  { icon: Link2, label: "Wiki link [[ ]]", kind: "wiki", value: "" },
] as const;

export function PageEditor({ page }: { page: Page }) {
  const { data, actions, state } = useBrain();
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [mode, setMode] = useState<Mode>(page.content ? "preview" : "write");
  const [focus, setFocus] = useState(false);
  const [wiki, setWiki] = useState<{ query: string; start: number } | null>(null);
  const [wikiSel, setWikiSel] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Keep local draft in sync if the page changes elsewhere (e.g. import).
  const pageId = page.id;
  useEffect(() => {
    setTitle(page.title);
    setContent(page.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // Debounced write-through to the store (which batches persistence).
  useEffect(() => {
    if (title === page.title && content === page.content) return;
    const t = setTimeout(() => actions.updatePage(page.id, { title, content }), 350);
    return () => clearTimeout(t);
  }, [title, content, page.id, page.title, page.content, actions]);

  useEffect(() => {
    if (!page.title && !page.content) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);
  useEffect(() => {
    const el = ta.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 420)}px`;
    }
  }, [content, mode]);

  const titleIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.pages) if (!p.archived) m.set(p.title.toLowerCase(), p.id);
    return m;
  }, [data.pages]);
  const resolveWiki = useCallback((t: string) => {
    const id = titleIndex.get(t.toLowerCase());
    return id ? `/pages/${id}` : null;
  }, [titleIndex]);
  const createFromWiki = useCallback(
    (t: string) => {
      const p = actions.createPage({ title: t, category: page.category });
      toast({ title: "Page created", description: t });
      router.push(`/pages/${p.id}`);
    },
    [actions, page.category, router, toast],
  );

  const categories = useMemo(() => uniq(data.pages.map((p) => p.category)), [data.pages]);
  const allTags = useMemo(() => uniq(data.pages.flatMap((p) => p.tags)), [data.pages]);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  // ── editing helpers ──────────────────────────────────────────────────
  const apply = (next: string, selStart: number, selEnd = selStart) => {
    setContent(next);
    requestAnimationFrame(() => {
      ta.current?.focus();
      ta.current?.setSelectionRange(selStart, selEnd);
    });
  };
  const tool = (t: (typeof TOOLS)[number]) => {
    if (mode === "preview") setMode("write");
    const el = ta.current;
    const s = el?.selectionStart ?? content.length;
    const e = el?.selectionEnd ?? content.length;
    if (t.kind === "wrap") {
      const sel = content.slice(s, e) || "text";
      apply(content.slice(0, s) + t.value + sel + t.value + content.slice(e), s + t.value.length, s + t.value.length + sel.length);
    } else if (t.kind === "line") {
      const ls = content.lastIndexOf("\n", s - 1) + 1;
      apply(content.slice(0, ls) + t.value + content.slice(ls), s + t.value.length);
    } else {
      const sel = content.slice(s, e);
      apply(content.slice(0, s) + "[[" + sel + "]]" + content.slice(e), s + 2 + sel.length);
      if (!sel) setWiki({ query: "", start: s + 2 });
    }
  };

  const wikiOptions = useMemo(() => {
    if (!wiki) return [];
    const q = wiki.query.toLowerCase();
    return data.pages
      .filter((p) => !p.archived && p.id !== page.id && p.title.toLowerCase().includes(q))
      .sort((a, b) => Number(b.title.toLowerCase().startsWith(q)) - Number(a.title.toLowerCase().startsWith(q)))
      .slice(0, 6);
  }, [wiki, data.pages, page.id]);

  const detectWiki = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const open = before.lastIndexOf("[[");
    if (open >= 0 && !before.slice(open).includes("]]") && !before.slice(open).includes("\n") && caret - open <= 60) {
      setWiki({ query: before.slice(open + 2), start: open + 2 });
      setWikiSel(0);
    } else setWiki(null);
  };
  const pickWiki = (t: string) => {
    if (!wiki) return;
    const caret = ta.current?.selectionStart ?? content.length;
    const after = content.slice(caret);
    const closing = after.startsWith("]]") ? 2 : 0;
    const next = content.slice(0, wiki.start) + t + "]]" + after.slice(closing);
    apply(next, wiki.start + t.length + 2);
    setWiki(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (wiki && wikiOptions.length) {
      if (e.key === "ArrowDown") return e.preventDefault(), setWikiSel((s) => (s + 1) % wikiOptions.length);
      if (e.key === "ArrowUp") return e.preventDefault(), setWikiSel((s) => (s - 1 + wikiOptions.length) % wikiOptions.length);
      if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), pickWiki(wikiOptions[wikiSel].title);
      if (e.key === "Escape") return e.preventDefault(), setWiki(null);
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "b") return e.preventDefault(), tool(TOOLS[2]);
    if (mod && e.key === "i") return e.preventDefault(), tool(TOOLS[3]);
    if (e.key === "Tab") {
      e.preventDefault();
      const s = e.currentTarget.selectionStart;
      apply(content.slice(0, s) + "  " + content.slice(e.currentTarget.selectionEnd), s + 2);
    }
    // Continue lists on Enter.
    if (e.key === "Enter" && !e.shiftKey) {
      const s = e.currentTarget.selectionStart;
      const ls = content.lastIndexOf("\n", s - 1) + 1;
      const line = content.slice(ls, s);
      const m = /^(\s*)([-*+] \[[ x]\] |[-*+] |(\d+)\. |> )/.exec(line);
      if (m) {
        e.preventDefault();
        if (line.trim() === m[2].trim()) return apply(content.slice(0, ls) + content.slice(s), ls);
        const marker = m[3] ? `${Number(m[3]) + 1}. ` : m[2].replace("[x]", "[ ]");
        const ins = "\n" + m[1] + marker;
        apply(content.slice(0, s) + ins + content.slice(s), s + ins.length);
      }
    }
  };

  const remove = async () => {
    if (await confirm({ title: `Delete “${title || "Untitled"}”?`, description: "This permanently removes the page.", confirmLabel: "Delete", danger: true })) {
      actions.deleteEntity("page", page.id);
      toast({ title: "Page deleted" });
      router.push("/pages");
    }
  };

  const editor = (
    <div className="relative">
      <textarea
        ref={ta}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          detectWiki(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onClick={(e) => detectWiki(content, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setWiki(null), 150)}
        placeholder={"Start writing…\n\nUse # for headings, - for lists, and [[Page title]] to link pages."}
        spellCheck
        className="block w-full resize-none overflow-hidden bg-transparent font-mono text-[14.5px] leading-[1.85] text-[#dcdbe3] caret-gold outline-none placeholder:text-fg-faint"
        aria-label="Page content"
      />
      <AnimatePresence>
        {wiki && wikiOptions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-strong sticky bottom-6 z-20 ml-auto w-72 rounded-2xl p-1.5" role="listbox" aria-label="Link to page">
            <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] uppercase tracking-[0.14em] text-fg-faint">Link to page</p>
            {wikiOptions.map((p, i) => (
              <button
                key={p.id}
                role="option"
                aria-selected={i === wikiSel}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickWiki(p.title);
                }}
                className={cn("block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px]", i === wikiSel ? "bg-white/[0.08] text-fg" : "text-fg-muted")}
              >
                {p.title}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  const preview = content.trim() ? (
    <Markdown source={content} resolveWiki={resolveWiki} onMissingWiki={createFromWiki} />
  ) : (
    <button onClick={() => setMode("write")} className="text-fg-faint hover:text-fg-muted">
      Nothing here yet — click to start writing.
    </button>
  );

  return (
    <div className={cn("grid gap-8 transition-all duration-500", focus ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className={cn("min-w-0", focus && "mx-auto w-full max-w-3xl")}>
        {/* Top bar */}
        <div className="sticky top-[76px] z-20 -mx-2 mb-8 flex flex-wrap items-center gap-2 rounded-2xl px-2 py-2 backdrop-blur-xl [background:linear-gradient(180deg,rgba(3,3,5,0.85),rgba(3,3,5,0.6))]">
          <Link href="/pages" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-fg-subtle hover:text-fg">
            <ArrowLeft className="size-3.5" /> Pages
          </Link>
          <span className="text-fg-faint">/</span>
          <Link href={`/pages?category=${encodeURIComponent(page.category)}`} className="text-[13px] text-fg-subtle hover:text-fg">
            {page.category}
          </Link>
          <span className="ml-2 text-[11.5px] text-fg-faint">{state.saveState === "saving" || title !== page.title || content !== page.content ? "Saving…" : `Saved ${relativeTime(page.updatedAt)}`}</span>
          <div className="ml-auto flex items-center gap-1">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "write", label: <><PenLine className="size-3.5" /><span className="hidden sm:inline">Write</span></> },
                { value: "split", label: <><Columns2 className="size-3.5" /><span className="hidden sm:inline">Split</span></>, title: "Split view" },
                { value: "preview", label: <><Eye className="size-3.5" /><span className="hidden sm:inline">Read</span></> },
              ]}
            />
            <IconButton label={page.pinned ? "Unpin" : "Pin"} active={page.pinned} onClick={() => actions.updatePage(page.id, { pinned: !page.pinned })}>
              <Pin className={cn("size-4", page.pinned && "fill-gold text-gold")} />
            </IconButton>
            <IconButton label={focus ? "Exit focus mode" : "Focus mode"} onClick={() => setFocus((f) => !f)}>
              {focus ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </IconButton>
            <DropMenu
              items={[
                {
                  label: "Archive",
                  icon: <Archive className="size-3.5" />,
                  onSelect: () => {
                    actions.setArchived("page", page.id, true);
                    toast({ title: "Page archived", action: { label: "Undo", onClick: () => actions.setArchived("page", page.id, false) } });
                    router.push("/pages");
                  },
                },
                { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: remove },
              ]}
            />
          </div>
        </div>

        <textarea
          ref={titleRef}
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setMode((m) => (m === "preview" ? "write" : m));
              requestAnimationFrame(() => ta.current?.focus());
            }
          }}
          placeholder="Untitled"
          aria-label="Page title"
          className="w-full resize-none overflow-hidden bg-transparent font-display text-[44px] leading-[1.08] tracking-[-0.01em] text-fg outline-none placeholder:text-fg-faint md:text-[56px]"
        />
        <div className="mb-8 mt-3 flex flex-wrap items-center gap-2 text-[12px] text-fg-subtle">
          <Badge accent="blue">{page.category}</Badge>
          {page.tags.map((t) => (
            <span key={t} className="text-fg-faint">#{t}</span>
          ))}
          <span className="text-fg-faint">· {words} words · {Math.max(1, Math.round(words / 230))} min read</span>
        </div>

        {mode !== "preview" && (
          <div className="no-scrollbar mb-4 flex gap-0.5 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1" role="toolbar" aria-label="Formatting">
            {TOOLS.map((t) => (
              <IconButton key={t.label} label={t.label} size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => tool(t)}>
                <t.icon className="size-3.5" />
              </IconButton>
            ))}
          </div>
        )}

        {mode === "write" && editor}
        {mode === "preview" && (
          <div onDoubleClick={() => setMode("write")} title="Double-click to edit">
            {preview}
          </div>
        )}
        {mode === "split" && (
          <div className="grid gap-8 xl:grid-cols-2">
            <div className="min-w-0">{editor}</div>
            <div className="min-w-0 border-white/[0.06] xl:border-l xl:pl-8">{preview}</div>
          </div>
        )}
      </div>

      {!focus && (
        <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-5 lg:sticky lg:top-[92px] lg:max-h-[calc(100dvh-110px)] lg:self-start lg:overflow-y-auto lg:pb-8 no-scrollbar">
          <AIStreamCard
            title="AI summary"
            cta="Summarise this page"
            saved={page.summary}
            saveLabel="Keep summary"
            request={() => ({ task: "summarize", title, content })}
            onSave={(text) => {
              actions.updatePage(page.id, { summary: text });
              toast({ title: "Summary saved to page" });
            }}
          />
          <div className="glass space-y-4 rounded-3xl p-5">
            <Field label="Category">
              <ComboInput id="page-category" options={categories} value={page.category} onChange={(e) => actions.updatePage(page.id, { category: e.target.value })} />
            </Field>
            <Field label="Tags">
              <TagInput value={page.tags} onChange={(tags) => actions.updatePage(page.id, { tags })} suggestions={allTags} />
            </Field>
            <AICategorize
              request={() => ({ task: "categorize", title, content, categories, tags: allTags })}
              onApply={(r) => {
                actions.updatePage(page.id, { category: r.category, tags: uniq([...page.tags, ...r.tags]) });
                toast({ title: "Category & tags applied" });
              }}
            />
            <dl className="grid grid-cols-2 gap-3 border-t hairline pt-4 text-[12px]">
              <div>
                <dt className="text-fg-faint">Created</dt>
                <dd className="mt-0.5 text-fg-muted">{formatDate(page.createdAt, { month: "short", day: "numeric", year: "numeric" })}</dd>
              </div>
              <div>
                <dt className="text-fg-faint">Updated</dt>
                <dd className="mt-0.5 text-fg-muted">{relativeTime(page.updatedAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="glass rounded-3xl p-5">
            <ConnectionsPanel id={page.id} kind="page" />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/graph?focus=${page.id}`)}>
            View in knowledge graph
          </Button>
        </motion.aside>
      )}
    </div>
  );
}
