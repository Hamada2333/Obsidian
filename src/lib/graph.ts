import type { EntityKind, Snapshot } from "./types";

export const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;

export function wikiTitles(content: string) {
  const out: string[] = [];
  for (const m of content.matchAll(WIKILINK_RE)) out.push(m[1].trim());
  return out;
}

export interface GraphNode {
  id: string;
  kind: EntityKind | "hub" | "core";
  title: string;
  category?: string;
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: "link" | "wiki" | "project" | "hub";
}

export function kindOfId(id: string): EntityKind | undefined {
  if (id.startsWith("pg")) return "page";
  if (id.startsWith("id")) return "idea";
  if (id.startsWith("ln")) return "link";
  if (id.startsWith("pj")) return "project";
  return undefined;
}

/** All explicit + implicit connections between live (non-archived) entities. */
export function buildEdges(data: Snapshot): GraphEdge[] {
  const live = new Set<string>();
  for (const col of [data.pages, data.ideas, data.links, data.projects]) for (const x of col) if (!x.archived) live.add(x.id);
  const titleToId = new Map<string, string>();
  for (const p of data.pages) if (!p.archived) titleToId.set(p.title.toLowerCase(), p.id);

  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  const add = (a: string, b: string, kind: GraphEdge["kind"]) => {
    if (a === b || !live.has(a) || !live.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: a, target: b, kind });
  };

  for (const p of data.pages) {
    for (const t of wikiTitles(p.content)) {
      const target = titleToId.get(t.toLowerCase());
      if (target) add(p.id, target, "wiki");
    }
    for (const l of p.linkIds) add(p.id, l, "link");
  }
  for (const x of data.ideas) {
    for (const l of x.linkIds) add(x.id, l, "link");
    if (x.projectId) add(x.id, x.projectId, "project");
  }
  for (const x of data.links) for (const l of x.linkIds) add(x.id, l, "link");
  for (const p of data.projects) {
    for (const id of p.pageIds) add(p.id, id, "project");
    for (const id of p.ideaIds) add(p.id, id, "project");
  }
  return edges;
}

export function neighbors(data: Snapshot, id: string, edges = buildEdges(data)) {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.source === id) out.add(e.target);
    else if (e.target === id) out.add(e.source);
  }
  return [...out];
}

/** Pages that reference this entity (wiki link or explicit link). */
export function backlinks(data: Snapshot, id: string) {
  const page = data.pages.find((p) => p.id === id);
  const title = page?.title.toLowerCase();
  return data.pages.filter(
    (p) =>
      p.id !== id &&
      !p.archived &&
      (p.linkIds.includes(id) || (title ? wikiTitles(p.content).some((t) => t.toLowerCase() === title) : false)),
  );
}

export function degreeMap(edges: GraphEdge[]) {
  const m = new Map<string, number>();
  for (const e of edges) {
    m.set(e.source, (m.get(e.source) ?? 0) + 1);
    m.set(e.target, (m.get(e.target) ?? 0) + 1);
  }
  return m;
}
