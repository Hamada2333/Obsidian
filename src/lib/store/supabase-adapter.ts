import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollectionKey, Snapshot } from "../types";
import type { ChangeSet, StorageAdapter } from "./adapter";
import { SNAPSHOT_VERSION } from "../seed";

const COLLECTIONS: CollectionKey[] = ["pages", "ideas", "links", "projects", "conversations", "activity"];

interface Row {
  id: string;
  data: unknown;
}

/**
 * Postgres persistence via Supabase. Each collection is its own table
 * (see supabase/migrations) with a JSONB `data` column and RLS scoping
 * every row to `auth.uid()`. Only changed rows are written.
 */
export class SupabaseAdapter implements StorageAdapter {
  readonly kind = "supabase" as const;
  constructor(
    private readonly sb: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<Snapshot | null> {
    const results = await Promise.all(
      COLLECTIONS.map((c) => this.sb.from(c).select("id,data").order("updated_at", { ascending: false })),
    );
    const settings = await this.sb.from("user_settings").select("profile,preferences").maybeSingle();
    for (const r of [...results, settings]) if (r.error) throw new Error(r.error.message);

    const total = results.reduce((n, r) => n + (r.data?.length ?? 0), 0);
    if (total === 0 && !settings.data) return null; // brand-new account

    const snap = {
      version: SNAPSHOT_VERSION,
      profile: settings.data?.profile ?? { name: "", email: "", role: "" },
      preferences: settings.data?.preferences ?? { reducedMotion: false, showIntro: true },
    } as Snapshot;
    COLLECTIONS.forEach((c, i) => {
      (snap as unknown as Record<string, unknown>)[c] = (results[i].data as Row[]).map((r) => r.data);
    });
    return snap;
  }

  async save(snapshot: Snapshot, changes: ChangeSet): Promise<void> {
    const ops: PromiseLike<{ error: { message: string } | null }>[] = [];
    const now = new Date().toISOString();

    if (changes.replaceAll) {
      for (const c of COLLECTIONS) ops.push(this.sb.from(c).delete().eq("user_id", this.userId));
      await this.run(ops.splice(0));
      for (const c of COLLECTIONS) {
        const rows = (snapshot[c] as Array<{ id: string }>).map((d) => this.row(d, now));
        if (rows.length) ops.push(this.sb.from(c).upsert(rows, { onConflict: "user_id,id" }));
      }
      changes = { ...changes, meta: true };
    } else {
      for (const [c, items] of Object.entries(changes.upserts) as Array<[CollectionKey, Array<{ id: string }>]>) {
        if (items.length) ops.push(this.sb.from(c).upsert(items.map((d) => this.row(d, now)), { onConflict: "user_id,id" }));
      }
      for (const [c, ids] of Object.entries(changes.deletes) as Array<[CollectionKey, string[]]>) {
        if (ids.length) ops.push(this.sb.from(c).delete().in("id", ids));
      }
    }
    if (changes.meta) {
      ops.push(
        this.sb
          .from("user_settings")
          .upsert({ user_id: this.userId, profile: snapshot.profile, preferences: snapshot.preferences, updated_at: now }),
      );
    }
    await this.run(ops);
  }

  private row(d: { id: string }, now: string) {
    return { id: d.id, user_id: this.userId, data: d, updated_at: now };
  }

  private async run(ops: PromiseLike<{ error: { message: string } | null }>[]) {
    const res = await Promise.all(ops);
    const err = res.find((r) => r.error);
    if (err?.error) throw new Error(err.error.message);
  }
}
