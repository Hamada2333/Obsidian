"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Archive, ExternalLink, Globe, Link2, Pencil, Plus, RotateCcw, Trash2, Wand2, X } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import type { LinkItem } from "@/lib/types";
import { relativeTime } from "@/lib/dates";
import { allDocs } from "@/lib/entities";
import { search } from "@/lib/search";
import { cn, hostname, normalizeUrl, uniq } from "@/lib/utils";
import { Badge, Tag } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ComboInput, Field, Input, Select, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { Drawer, Modal } from "@/components/ui/overlay";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { Chips, FilterSearch } from "@/components/common/filter-bar";
import { DropMenu } from "@/components/common/entity-menu";
import { ConnectionsPanel } from "@/components/connections";

const HUES = ["#5aa9ff", "#e8b86b", "#3ddc97", "#a78bfa", "#fb7185", "#22d3ee"];
function SiteMark({ url, size = 40 }: { url: string; size?: number }) {
  const host = hostname(url);
  const hue = HUES[[...host].reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl border text-[15px] font-semibold uppercase" style={{ width: size, height: size, color: hue, borderColor: `${hue}33`, background: `radial-gradient(circle at 30% 20%, ${hue}26, ${hue}08)` }}>
      {host[0] ?? <Globe className="size-4" />}
    </span>
  );
}

async function unfurl(url: string): Promise<{ title: string; description: string } | null> {
  try {
    const r = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function LinkForm({ link, onDone }: { link?: LinkItem; onDone: (l?: LinkItem) => void }) {
  const { data, actions } = useBrain();
  const { toast } = useFeedback();
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [category, setCategory] = useState(link?.category ?? "Reading");
  const [tags, setTags] = useState<string[]>(link?.tags ?? []);
  const [fetching, setFetching] = useState(false);
  const categories = useMemo(() => uniq(data.links.map((l) => l.category)), [data.links]);
  const allTags = useMemo(() => uniq(data.links.flatMap((l) => l.tags)), [data.links]);
  const valid = (() => {
    try {
      new URL(normalizeUrl(url));
      return url.includes(".");
    } catch {
      return false;
    }
  })();
  const duplicate = !link && data.links.find((l) => normalizeUrl(l.url) === normalizeUrl(url));

  const fetchMeta = async (silent = false) => {
    if (!valid) return;
    setFetching(true);
    const m = await unfurl(normalizeUrl(url));
    setFetching(false);
    if (m) {
      if (!title && m.title) setTitle(m.title);
      if (!description && m.description) setDescription(m.description);
    } else if (!silent) toast({ tone: "info", title: "Couldn't fetch page details", description: "You can fill them in manually." });
  };

  const save = () => {
    const u = normalizeUrl(url);
    const payload = { url: u, title: title.trim() || hostname(u), description: description.trim(), category: category.trim() || "Reading", tags };
    if (link) {
      actions.updateLink(link.id, payload);
      toast({ title: "Link updated" });
      onDone(link);
    } else {
      const l = actions.createLink(payload);
      toast({ title: "Link saved", description: payload.title });
      onDone(l);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save();
      }}
      className="space-y-4"
    >
      <Field label="URL" hint={duplicate ? <span className="text-gold">Already saved</span> : undefined}>
        <div className="flex gap-2">
          <Input data-autofocus value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => !title && valid && fetchMeta(true)} placeholder="https://…" type="text" inputMode="url" />
          <Button type="button" size="md" variant="secondary" loading={fetching} disabled={!valid} onClick={() => fetchMeta()} icon={<Wand2 className="size-3.5" />} title="Fetch title & description">
            <span className="hidden sm:inline">Fetch</span>
          </Button>
        </div>
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={valid ? hostname(normalizeUrl(url)) : "Title"} />
      </Field>
      <Field label="Description">
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why is this worth keeping?" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <ComboInput id="link-cat" options={categories} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Tags">
          <TagInput value={tags} onChange={setTags} suggestions={allTags} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!valid}>
          {link ? "Save changes" : "Save link"}
        </Button>
      </div>
    </form>
  );
}

function LinkDetail({ link, onClose }: { link: LinkItem | null; onClose: () => void }) {
  const { actions } = useBrain();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [link?.id]);
  return (
    <Drawer open={!!link} onClose={onClose}>
      {link && (
        <>
          <div className="flex items-center justify-between border-b hairline px-6 py-4">
            <p className="text-[12px] text-fg-subtle">Saved {relativeTime(link.createdAt)}</p>
            <div className="flex gap-1">
              <IconButton label="Edit" active={editing} onClick={() => setEditing((v) => !v)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label="Close" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {editing ? (
              <LinkForm link={link} onDone={() => setEditing(false)} />
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <SiteMark url={link.url} size={52} />
                  <div className="min-w-0">
                    <h2 className="font-display text-3xl leading-tight text-fg">{link.title}</h2>
                    <a href={link.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 break-all text-[13px] text-emerald hover:underline">
                      {hostname(link.url)} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
                {link.description && <p className="text-[15px] leading-relaxed text-fg-muted">{link.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <Badge accent="emerald">{link.category}</Badge>
                  {link.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <a href={link.url} target="_blank" rel="noreferrer noopener">
                  <Button variant="primary" size="sm" icon={<ExternalLink className="size-3.5" />}>
                    Open link
                  </Button>
                </a>
              </>
            )}
            <div className="glass rounded-3xl p-5">
              <ConnectionsPanel id={link.id} kind="link" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t hairline px-6 py-4">
            {link.archived ? (
              <Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => actions.setArchived("link", link.id, false)}>
                Restore
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={<Archive className="size-3.5" />}
                onClick={() => {
                  actions.setArchived("link", link.id, true);
                  toast({ title: "Link archived", action: { label: "Undo", onClick: () => actions.setArchived("link", link.id, false) } });
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
                if (await confirm({ title: "Delete this link?", confirmLabel: "Delete", danger: true })) {
                  actions.deleteEntity("link", link.id);
                  toast({ title: "Link deleted" });
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

function LinksView() {
  const { data, actions } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useFeedback();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const adding = params.get("new") === "1";
  const openId = params.get("open");
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`/links${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const live = useMemo(() => data.links.filter((l) => !l.archived), [data.links]);
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of live) m.set(l.category, (m.get(l.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);
  const tags = useMemo(() => uniq(live.flatMap((l) => l.tags)).sort(), [live]);
  const links = useMemo(() => {
    let list = live;
    if (category) list = list.filter((l) => l.category === category);
    if (tag) list = list.filter((l) => l.tags.includes(tag));
    if (q.trim()) {
      const ids = new Set(list.map((l) => l.id));
      return search(allDocs(data).filter((d) => ids.has(d.id)), q, 300).map((h) => list.find((l) => l.id === h.doc.id)!);
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [live, category, tag, q, data]);

  // Paste a URL anywhere on the page to save it.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (/input|textarea/i.test(t.tagName)) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && /^https?:\/\/\S+$/.test(text)) {
        const l = actions.createLink({ url: text, title: hostname(text) });
        toast({ title: "Link saved from clipboard", description: text });
        void unfurl(text).then((m) => m && actions.updateLink(l.id, { title: m.title || l.title, description: m.description }));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [actions, toast]);

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Links"
        description="Articles, docs and references worth returning to. Tip: paste a URL anywhere on this page to save it."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setParam("new", "1")}>
            Save link
          </Button>
        }
      />
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearch value={q} onChange={setQ} placeholder="Filter links…" />
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
        </div>
        <Chips value={category} onChange={setCategory} options={cats.map(([c, n]) => ({ value: c, label: c, count: n }))} allLabel="All links" />
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="size-6" />}
          title={live.length ? "No links match" : "Your library is empty"}
          description={live.length ? "Try another filter." : "Save articles, docs and tools you want to find again."}
          action={
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setParam("new", "1")}>
              Save link
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {links.map((l, i) => (
              <motion.div
                layout
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.02 }}
                className="glass group relative flex cursor-pointer flex-col rounded-3xl p-5 transition hover:border-white/[0.14]"
                onClick={() => setParam("open", l.id)}
              >
                <div className="flex items-start gap-3">
                  <SiteMark url={l.url} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[14.5px] font-medium leading-snug text-fg">{l.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-emerald/80">{hostname(l.url)}</p>
                  </div>
                  <div className="-mr-2 -mt-1 flex opacity-60 transition group-hover:opacity-100">
                    <a href={l.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} aria-label={`Open ${l.title}`} className="flex size-8 items-center justify-center rounded-lg text-fg-subtle hover:bg-white/[0.07] hover:text-fg">
                      <ExternalLink className="size-4" />
                    </a>
                    <DropMenu
                      items={[
                        { label: "Edit", icon: <Pencil className="size-3.5" />, onSelect: () => setParam("open", l.id) },
                        {
                          label: "Archive",
                          icon: <Archive className="size-3.5" />,
                          onSelect: () => {
                            actions.setArchived("link", l.id, true);
                            toast({ title: "Link archived", action: { label: "Undo", onClick: () => actions.setArchived("link", l.id, false) } });
                          },
                        },
                        { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: () => (actions.deleteEntity("link", l.id), toast({ title: "Link deleted" })) },
                      ]}
                    />
                  </div>
                </div>
                {l.description && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{l.description}</p>}
                <div className={cn("mt-auto flex flex-wrap items-center gap-1.5 pt-4")}>
                  <Badge accent="emerald">{l.category}</Badge>
                  {l.tags.slice(0, 2).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  <span className="ml-auto text-[11px] text-fg-faint">{relativeTime(l.createdAt)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={adding} onClose={() => setParam("new", null)} title="Save a link" description="We'll fetch the page title and description for you.">
        <LinkForm onDone={() => setParam("new", null)} />
      </Modal>
      <LinkDetail link={data.links.find((l) => l.id === openId) ?? null} onClose={() => setParam("open", null)} />
    </div>
  );
}

const Gated = withBrain(LinksView);
export default function LinksRoute() {
  return (
    <Suspense>
      <Gated />
    </Suspense>
  );
}
