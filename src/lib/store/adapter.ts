import type { CollectionKey, Snapshot } from "../types";

export interface ChangeSet {
  upserts: Partial<Record<CollectionKey, Array<{ id: string }>>>;
  deletes: Partial<Record<CollectionKey, string[]>>;
  meta: boolean; // profile / preferences changed
  replaceAll?: boolean; // import / reset
}

export function emptyChanges(): ChangeSet {
  return { upserts: {}, deletes: {}, meta: false };
}

export function mergeChanges(a: ChangeSet, b: ChangeSet): ChangeSet {
  const out: ChangeSet = {
    upserts: { ...a.upserts },
    deletes: { ...a.deletes },
    meta: a.meta || b.meta,
    replaceAll: a.replaceAll || b.replaceAll,
  };
  for (const [k, rows] of Object.entries(b.upserts) as Array<[CollectionKey, Array<{ id: string }>]>) {
    const map = new Map((out.upserts[k] ?? []).map((r) => [r.id, r]));
    for (const r of rows) map.set(r.id, r);
    out.upserts[k] = [...map.values()];
    if (out.deletes[k]) out.deletes[k] = out.deletes[k]!.filter((id) => !map.has(id));
  }
  for (const [k, ids] of Object.entries(b.deletes) as Array<[CollectionKey, string[]]>) {
    out.deletes[k] = [...new Set([...(out.deletes[k] ?? []), ...ids])];
    if (out.upserts[k]) out.upserts[k] = out.upserts[k]!.filter((r) => !ids.includes(r.id));
  }
  return out;
}

/** Persistence backend. Implementations: local (browser) and Supabase (Postgres). */
export interface StorageAdapter {
  readonly kind: "local" | "supabase";
  load(): Promise<Snapshot | null>;
  save(snapshot: Snapshot, changes: ChangeSet): Promise<void>;
}
