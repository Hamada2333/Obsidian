import type { EntityKind, Snapshot } from "./types";
import { excerpt, hrefFor } from "./utils";

export interface Doc {
  id: string;
  kind: EntityKind | "conversation";
  title: string;
  body: string;
  tags: string[];
  category: string;
  href: string;
  updatedAt: string;
  archived: boolean;
  meta?: string;
}

/** Flattens every entity into a uniform document for search, AI context and similarity. */
export function allDocs(data: Snapshot, { includeArchived = false } = {}): Doc[] {
  const docs: Doc[] = [
    ...data.pages.map((p) => ({
      id: p.id,
      kind: "page" as const,
      title: p.title || "Untitled",
      body: p.content,
      tags: p.tags,
      category: p.category,
      href: hrefFor("page", p.id),
      updatedAt: p.updatedAt,
      archived: p.archived,
    })),
    ...data.ideas.map((x) => ({
      id: x.id,
      kind: "idea" as const,
      title: x.title || "Untitled idea",
      body: x.description,
      tags: x.tags,
      category: x.category,
      href: hrefFor("idea", x.id),
      updatedAt: x.updatedAt,
      archived: x.archived,
      meta: x.status,
    })),
    ...data.links.map((x) => ({
      id: x.id,
      kind: "link" as const,
      title: x.title || x.url,
      body: `${x.description} ${x.url}`,
      tags: x.tags,
      category: x.category,
      href: hrefFor("link", x.id),
      updatedAt: x.updatedAt,
      archived: x.archived,
    })),
    ...data.projects.map((x) => ({
      id: x.id,
      kind: "project" as const,
      title: x.title || "Untitled project",
      body: `${x.description}\n${x.tasks.map((t) => t.title).join("\n")}`,
      tags: x.tags,
      category: x.status,
      href: hrefFor("project", x.id),
      updatedAt: x.updatedAt,
      archived: x.archived,
      meta: x.status,
    })),
    ...data.conversations.map((c) => ({
      id: c.id,
      kind: "conversation" as const,
      title: c.title,
      body: `${c.summary}\n${c.transcript ?? ""}`,
      tags: [],
      category: c.category,
      href: hrefFor("conversation", c.id),
      updatedAt: c.date,
      archived: false,
    })),
  ];
  return includeArchived ? docs : docs.filter((d) => !d.archived);
}

export function findDoc(data: Snapshot, id: string) {
  return allDocs(data, { includeArchived: true }).find((d) => d.id === id);
}

export function docPreview(d: Doc, len = 120) {
  return excerpt(d.body, len);
}
