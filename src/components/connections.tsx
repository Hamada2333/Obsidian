"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Link2, Plus, Search, X } from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import { allDocs, findDoc, type Doc } from "@/lib/entities";
import { search } from "@/lib/search";
import { backlinks, buildEdges, kindOfId, neighbors } from "@/lib/graph";
import { relatedDocs } from "@/lib/similarity";
import type { EntityKind } from "@/lib/types";
import { KIND_LABEL, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/overlay";
import { Input } from "@/components/ui/field";
import { KindIcon } from "@/components/shell/kind-icon";

export function EntityPicker({ open, onClose, onPick, exclude = [], kinds, title = "Connect to…" }: { open: boolean; onClose: () => void; onPick: (doc: Doc) => void; exclude?: string[]; kinds?: Array<EntityKind>; title?: string }) {
  const { data } = useBrain();
  const [q, setQ] = useState("");
  const docs = useMemo(() => allDocs(data).filter((d) => d.kind !== "conversation" && !exclude.includes(d.id) && (!kinds || kinds.includes(d.kind as EntityKind))), [data, exclude, kinds]);
  const results = q.trim() ? search(docs, q, 30).map((h) => h.doc) : [...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
  return (
    <Modal open={open} onClose={onClose} title={title} className="sm:max-w-xl">
      <Input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages, ideas, links, projects…" icon={<Search className="size-4" />} />
      <div className="-mx-2 mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">
        {results.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              onPick(d);
              setQ("");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.05]"
          >
            <KindIcon kind={d.kind} boxed />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-fg">{d.title}</span>
              <span className="block text-[11.5px] text-fg-subtle">
                {KIND_LABEL[d.kind]} · {d.category}
              </span>
            </span>
            <Plus className="size-4 text-fg-faint" />
          </button>
        ))}
        {results.length === 0 && <p className="py-8 text-center text-sm text-fg-subtle">Nothing found.</p>}
      </div>
    </Modal>
  );
}

function Row({ doc, onRemove, hint }: { doc: Doc; onRemove?: () => void; hint?: string }) {
  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]">
      <KindIcon kind={doc.kind} className="size-3.5 shrink-0" />
      <Link href={doc.href} className="min-w-0 flex-1 truncate text-[13px] text-fg-muted hover:text-fg">
        {doc.title}
      </Link>
      {hint && <span className="shrink-0 text-[10.5px] text-fg-faint">{hint}</span>}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Disconnect ${doc.title}`} className="rounded p-0.5 text-fg-faint opacity-0 transition hover:text-rose group-hover:opacity-100 focus:opacity-100">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Connections panel: explicit links, wiki links, backlinks and content-similar suggestions. */
export function ConnectionsPanel({ id, kind }: { id: string; kind: EntityKind }) {
  const { data, actions } = useBrain();
  const [picking, setPicking] = useState(false);
  const edges = useMemo(() => buildEdges(data), [data]);
  const connectedIds = useMemo(() => neighbors(data, id, edges), [data, id, edges]);
  const back = useMemo(() => new Set(backlinks(data, id).map((p) => p.id)), [data, id]);
  const connected = connectedIds.map((cid) => findDoc(data, cid)).filter(Boolean) as Doc[];
  const related = useMemo(() => relatedDocs(allDocs(data), id, 6).filter((r) => !connectedIds.includes(r.doc.id) && r.doc.kind !== "conversation").slice(0, 4), [data, id, connectedIds]);

  const ownsLink = (target: string) => {
    if (kind === "project") {
      const p = data.projects.find((x) => x.id === id);
      return !!p && (p.pageIds.includes(target) || p.ideaIds.includes(target));
    }
    const e = [...data.pages, ...data.ideas, ...data.links].find((x) => x.id === id) as { linkIds: string[] } | undefined;
    return !!e?.linkIds.includes(target);
  };

  const removeConnection = (target: string) => {
    if (ownsLink(target)) return actions.disconnect(kind, id, target);
    const tk = kindOfId(target);
    if (tk) actions.disconnect(tk, target, id);
  };

  const connect = (target: Doc) => {
    if (kind === "project" && target.kind !== "page" && target.kind !== "idea") {
      // Projects hold pages & ideas; for links store the edge on the link.
      actions.connect(target.kind as EntityKind, target.id, id);
    } else actions.connect(kind, id, target.id);
    setPicking(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Connections · {connected.length}</p>
          <button onClick={() => setPicking(true)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[12px] text-gold/90 hover:bg-gold/10">
            <Link2 className="size-3" /> Connect
          </button>
        </div>
        {connected.length === 0 ? (
          <p className="px-2 py-2 text-[12.5px] text-fg-faint">No connections yet. Use [[Page title]] in text or connect manually.</p>
        ) : (
          <div className="-mx-2">
            {connected.map((d) => (
              <Row key={d.id} doc={d} hint={back.has(d.id) ? "backlink" : undefined} onRemove={back.has(d.id) && !ownsLink(d.id) && d.kind === "page" ? undefined : () => removeConnection(d.id)} />
            ))}
          </div>
        )}
      </div>
      {related.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Similar by content</p>
          <div className="-mx-2">
            {related.map((r) => (
              <div key={r.doc.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
                <KindIcon kind={r.doc.kind} className="size-3.5 shrink-0" />
                <Link href={r.doc.href} className="min-w-0 flex-1 truncate text-[13px] text-fg-muted hover:text-fg">
                  {r.doc.title}
                </Link>
                <span className={cn("text-[10.5px] tabular-nums text-fg-faint group-hover:hidden")}>{Math.round(r.score * 100)}%</span>
                <button onClick={() => connect(r.doc)} className="hidden rounded-md px-1.5 text-[11px] text-gold hover:bg-gold/10 group-hover:block">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <EntityPicker open={picking} onClose={() => setPicking(false)} onPick={connect} exclude={[id, ...connectedIds]} />
    </div>
  );
}
