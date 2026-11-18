import type { Doc } from "./entities";

export interface SearchHit {
  doc: Doc;
  score: number;
  snippet: string;
  matches: string[];
}

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9#@]+/)
    .filter(Boolean);

function snippetFor(body: string, terms: string[], radius = 70) {
  const clean = body.replace(/\s+/g, " ").replace(/[#>*`]/g, "").trim();
  const lower = clean.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    idx = lower.indexOf(t);
    if (idx >= 0) break;
  }
  if (idx < 0) return clean.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(clean.length, idx + radius);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}

function subsequence(needle: string, hay: string) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

/**
 * Instant client-side full-text search. Every query term must match
 * somewhere (title, tags, category or body); titles weigh most and
 * recency breaks ties. Typos in single-word queries fall back to a
 * subsequence match on titles.
 */
export function search(docs: Doc[], query: string, limit = 30): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const now = Date.now();
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const titleWords = tokenize(doc.title);
    const body = doc.body.toLowerCase();
    const tags = doc.tags.map((t) => t.toLowerCase());
    const category = doc.category.toLowerCase();
    let score = 0;
    const matches: string[] = [];
    let all = true;

    for (const t of terms) {
      let s = 0;
      if (titleWords.includes(t)) s += 12;
      else if (titleWords.some((w) => w.startsWith(t))) s += 8;
      else if (title.includes(t)) s += 5;
      if (tags.some((g) => g === t || g.startsWith(t))) s += 4;
      if (category.includes(t)) s += 2;
      if (body.includes(t)) {
        let count = 0;
        let from = 0;
        while (count < 5 && (from = body.indexOf(t, from)) !== -1) {
          count++;
          from += t.length;
        }
        s += 1 + count * 0.6;
      }
      if (s === 0 && terms.length === 1 && t.length >= 3 && subsequence(t, title.replace(/\s/g, ""))) s += 2;
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
      matches.push(t);
    }
    if (!all) continue;
    if (title === query.trim().toLowerCase()) score += 20;
    const ageDays = (now - new Date(doc.updatedAt).getTime()) / 86_400_000;
    score += Math.max(0, 2 - ageDays / 30);
    hits.push({ doc, score, snippet: snippetFor(doc.body, terms), matches });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export { tokenize };
