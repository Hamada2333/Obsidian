import type { Accent, EntityKind, Project } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "") {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rand}` : rand;
}

export const nowIso = () => new Date().toISOString();

export function hrefFor(kind: EntityKind | "conversation", id: string) {
  switch (kind) {
    case "page":
      return `/pages/${id}`;
    case "project":
      return `/projects/${id}`;
    case "idea":
      return `/ideas?open=${id}`;
    case "link":
      return `/links?open=${id}`;
    case "conversation":
      return `/?conversation=${id}`;
  }
}

export const ACCENT_HEX: Record<Accent, string> = {
  gold: "#e8b86b",
  blue: "#5aa9ff",
  emerald: "#3ddc97",
  violet: "#a78bfa",
  rose: "#fb7185",
};

export const KIND_ACCENT: Record<EntityKind | "conversation", Accent> = {
  page: "blue",
  idea: "gold",
  link: "emerald",
  project: "violet",
  conversation: "rose",
};

export const KIND_LABEL: Record<EntityKind | "conversation", string> = {
  page: "Page",
  idea: "Idea",
  link: "Link",
  project: "Project",
  conversation: "Conversation",
};

export function projectProgress(p: Project) {
  if (p.tasks.length === 0) return p.progress;
  return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return v;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n.toLocaleString()} ${n === 1 ? word : pluralWord}`;
}

export function excerpt(markdown: string, len = 140) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;
}
