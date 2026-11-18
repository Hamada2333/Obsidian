import type { Snapshot } from "../types";
import type { StorageAdapter } from "./adapter";

const KEY = "second-brain:v1";

/** Stores the whole workspace in localStorage. Zero-config default. */
export class LocalAdapter implements StorageAdapter {
  readonly kind = "local" as const;

  async load(): Promise<Snapshot | null> {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch {
      return null;
    }
  }

  async save(snapshot: Snapshot): Promise<void> {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch (err) {
      throw new Error(
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Browser storage is full. Export your data or connect Supabase."
          : "Could not save to browser storage.",
      );
    }
  }
}
