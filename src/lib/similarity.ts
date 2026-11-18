import type { Doc } from "./entities";
import { tokenize } from "./search";

const STOP = new Set(
  "the a an and or of to in on for with is are was be by as at it this that from into we i you our your my not no but if then so than too very can will just about over more most also have has had do does did".split(
    " ",
  ),
);

type Vec = Map<string, number>;

function termFreq(doc: Doc): Vec {
  const v: Vec = new Map();
  const add = (text: string, w: number) => {
    for (const t of tokenize(text)) {
      if (t.length < 3 || STOP.has(t)) continue;
      v.set(t, (v.get(t) ?? 0) + w);
    }
  };
  add(doc.title, 3);
  add(doc.tags.join(" "), 2.5);
  add(doc.category, 1);
  add(doc.body, 1);
  return v;
}

/**
 * Content-based "related" recommendations using TF-IDF cosine similarity.
 * Runs entirely in the browser, no AI key needed.
 */
export function relatedDocs(docs: Doc[], targetId: string, limit = 5) {
  const tfs = docs.map(termFreq);
  const df = new Map<string, number>();
  for (const tf of tfs) for (const k of tf.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  const N = docs.length;
  const vecs = tfs.map((tf) => {
    const v: Vec = new Map();
    let norm = 0;
    for (const [k, f] of tf) {
      const w = (1 + Math.log(f)) * Math.log(1 + N / (df.get(k) ?? 1));
      v.set(k, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [k, w] of v) v.set(k, w / norm);
    return v;
  });
  const ti = docs.findIndex((d) => d.id === targetId);
  if (ti < 0) return [];
  const target = vecs[ti];
  const scored: Array<{ doc: Doc; score: number }> = [];
  docs.forEach((d, i) => {
    if (i === ti) return;
    let dot = 0;
    const [small, big] = target.size < vecs[i].size ? [target, vecs[i]] : [vecs[i], target];
    for (const [k, w] of small) dot += w * (big.get(k) ?? 0);
    if (dot > 0.06) scored.push({ doc: d, score: dot });
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
