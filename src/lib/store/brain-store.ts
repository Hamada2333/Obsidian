import type {
  Activity,
  ActivityAction,
  CollectionKey,
  Conversation,
  EntityKind,
  Idea,
  LinkItem,
  Page,
  Preferences,
  Profile,
  Project,
  Snapshot,
} from "../types";
import { createSeed, SNAPSHOT_VERSION } from "../seed";
import { nowIso, uid } from "../utils";
import { emptyChanges, mergeChanges, type ChangeSet, type StorageAdapter } from "./adapter";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface StoreState {
  status: "loading" | "ready" | "error";
  error?: string;
  saveState: SaveState;
  saveError?: string;
  backend: StorageAdapter["kind"];
  data: Snapshot;
}

const COLLECTION_OF: Record<EntityKind, "pages" | "ideas" | "links" | "projects"> = {
  page: "pages",
  idea: "ideas",
  link: "links",
  project: "projects",
};

type Listener = () => void;
type EntityOf = { page: Page; idea: Idea; link: LinkItem; project: Project };

/**
 * Single source of truth for the workspace. React subscribes through
 * useSyncExternalStore; writes are applied optimistically and flushed to the
 * adapter in debounced batches so typing in the editor stays instant.
 */
export class BrainStore {
  private state: StoreState;
  private listeners = new Set<Listener>();
  private pending: ChangeSet = emptyChanges();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;

  constructor(private adapter: StorageAdapter) {
    this.state = { status: "loading", saveState: "idle", backend: adapter.kind, data: createSeed() };
  }

  // ── subscription ────────────────────────────────────────────────────────
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getState = () => this.state;
  private set(patch: Partial<StoreState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  async init() {
    try {
      const loaded = await this.adapter.load();
      if (loaded) {
        this.set({ status: "ready", data: migrate(loaded) });
      } else {
        const seed = createSeed();
        this.set({ status: "ready", data: seed });
        this.queue({ ...emptyChanges(), replaceAll: true });
      }
    } catch (err) {
      this.set({ status: "error", error: err instanceof Error ? err.message : "Failed to load workspace" });
    }
  }

  private queue(changes: ChangeSet) {
    this.pending = mergeChanges(this.pending, changes);
    if (this.timer) clearTimeout(this.timer);
    this.set({ saveState: "saving" });
    this.timer = setTimeout(() => void this.flush(), 450);
  }

  async flush() {
    if (this.flushing) await this.flushing;
    const changes = this.pending;
    this.pending = emptyChanges();
    const hasWork =
      changes.replaceAll ||
      changes.meta ||
      Object.values(changes.upserts).some((v) => v?.length) ||
      Object.values(changes.deletes).some((v) => v?.length);
    if (!hasWork) return;
    this.flushing = this.adapter
      .save(this.state.data, changes)
      .then(() => this.set({ saveState: "saved", saveError: undefined }))
      .catch((err: unknown) => {
        // Put the changes back so the next write retries them.
        this.pending = mergeChanges(changes, this.pending);
        this.set({ saveState: "error", saveError: err instanceof Error ? err.message : "Save failed" });
      })
      .finally(() => {
        this.flushing = null;
      });
    await this.flushing;
  }

  // ── generic helpers ─────────────────────────────────────────────────────
  private commit(
    data: Snapshot,
    upserts: Partial<Record<CollectionKey, Array<{ id: string }>>> = {},
    deletes: Partial<Record<CollectionKey, string[]>> = {},
    meta = false,
  ) {
    this.set({ data });
    this.queue({ upserts, deletes, meta });
  }

  private log(
    data: Snapshot,
    kind: Activity["kind"],
    action: ActivityAction,
    entityId: string,
    title: string,
  ): { data: Snapshot; entry: Activity; replacedId?: string } {
    const at = nowIso();
    const [latest] = data.activity;
    // Coalesce rapid edits (autosave) into one "updated" entry.
    if (
      latest &&
      action === "updated" &&
      latest.action === "updated" &&
      latest.entityId === entityId &&
      Date.now() - new Date(latest.at).getTime() < 10 * 60_000
    ) {
      const entry = { ...latest, at, title };
      return { data: { ...data, activity: [entry, ...data.activity.slice(1)] }, entry };
    }
    const entry: Activity = { id: uid("ac"), kind, action, entityId, title, at };
    const activity = [entry, ...data.activity];
    const trimmed = activity.slice(0, 500);
    const dropped = activity.slice(500).map((a) => a.id);
    return { data: { ...data, activity: trimmed }, entry, replacedId: dropped[0] };
  }

  private upsertEntity<K extends EntityKind>(kind: K, entity: EntityOf[K], action: ActivityAction) {
    const col = COLLECTION_OF[kind];
    const list = this.state.data[col] as Array<{ id: string }>;
    const exists = list.some((x) => x.id === entity.id);
    const nextList = exists ? list.map((x) => (x.id === entity.id ? entity : x)) : [entity, ...list];
    let data = { ...this.state.data, [col]: nextList } as Snapshot;
    const logged = this.log(data, kind, action, entity.id, (entity as { title: string }).title || "Untitled");
    data = logged.data;
    this.commit(
      data,
      { [col]: [entity], activity: [logged.entry] },
      logged.replacedId ? { activity: [logged.replacedId] } : {},
    );
  }

  private find<K extends EntityKind>(kind: K, id: string) {
    return (this.state.data[COLLECTION_OF[kind]] as Array<{ id: string }>).find((x) => x.id === id) as
      | EntityOf[K]
      | undefined;
  }

  // ── pages ───────────────────────────────────────────────────────────────
  createPage = (init: Partial<Page> = {}): Page => {
    const t = nowIso();
    const page: Page = {
      id: uid("pg"),
      title: "",
      content: "",
      category: "Reference notes",
      tags: [],
      pinned: false,
      linkIds: [],
      archived: false,
      createdAt: t,
      updatedAt: t,
      ...init,
    };
    this.upsertEntity("page", page, "created");
    return page;
  };

  updatePage = (id: string, patch: Partial<Page>) => {
    const cur = this.find("page", id);
    if (!cur) return;
    this.upsertEntity("page", { ...cur, ...patch, updatedAt: nowIso() }, "updated");
  };

  // ── ideas ───────────────────────────────────────────────────────────────
  createIdea = (init: Partial<Idea> = {}): Idea => {
    const t = nowIso();
    const idea: Idea = {
      id: uid("id"),
      title: "",
      description: "",
      category: "General",
      tags: [],
      status: "inbox",
      linkIds: [],
      archived: false,
      createdAt: t,
      updatedAt: t,
      ...init,
    };
    this.upsertEntity("idea", idea, "created");
    return idea;
  };

  updateIdea = (id: string, patch: Partial<Idea>) => {
    const cur = this.find("idea", id);
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: nowIso() };
    if (patch.status) next.archived = patch.status === "archived";
    const action: ActivityAction =
      patch.status === "completed" && cur.status !== "completed"
        ? "completed"
        : patch.status === "archived" && cur.status !== "archived"
          ? "archived"
          : "updated";
    this.upsertEntity("idea", next, action);
  };

  convertIdeaToProject = (ideaId: string): Project | undefined => {
    const idea = this.find("idea", ideaId);
    if (!idea) return;
    const t = nowIso();
    const project: Project = {
      id: uid("pj"),
      title: idea.title,
      description: idea.description,
      status: "planning",
      progress: 0,
      color: "gold",
      tags: idea.tags,
      pageIds: idea.linkIds.filter((x) => x.startsWith("pg")),
      ideaIds: [idea.id],
      tasks: [],
      archived: false,
      createdAt: t,
      updatedAt: t,
    };
    const updatedIdea: Idea = { ...idea, projectId: project.id, status: "in-progress", archived: false, updatedAt: t };
    let data: Snapshot = {
      ...this.state.data,
      projects: [project, ...this.state.data.projects],
      ideas: this.state.data.ideas.map((x) => (x.id === idea.id ? updatedIdea : x)),
    };
    const logged = this.log(data, "idea", "converted", idea.id, idea.title);
    data = logged.data;
    this.commit(data, { projects: [project], ideas: [updatedIdea], activity: [logged.entry] });
    return project;
  };

  // ── links ───────────────────────────────────────────────────────────────
  createLink = (init: Partial<LinkItem> & { url: string }): LinkItem => {
    const t = nowIso();
    const link: LinkItem = {
      id: uid("ln"),
      title: "",
      description: "",
      category: "Reading",
      tags: [],
      linkIds: [],
      archived: false,
      createdAt: t,
      updatedAt: t,
      ...init,
    };
    this.upsertEntity("link", link, "created");
    return link;
  };

  updateLink = (id: string, patch: Partial<LinkItem>) => {
    const cur = this.find("link", id);
    if (!cur) return;
    this.upsertEntity("link", { ...cur, ...patch, updatedAt: nowIso() }, "updated");
  };

  // ── projects ────────────────────────────────────────────────────────────
  createProject = (init: Partial<Project> = {}): Project => {
    const t = nowIso();
    const project: Project = {
      id: uid("pj"),
      title: "",
      description: "",
      status: "planning",
      progress: 0,
      color: "violet",
      tags: [],
      pageIds: [],
      ideaIds: [],
      tasks: [],
      archived: false,
      createdAt: t,
      updatedAt: t,
      ...init,
    };
    this.upsertEntity("project", project, "created");
    return project;
  };

  updateProject = (id: string, patch: Partial<Project>) => {
    const cur = this.find("project", id);
    if (!cur) return;
    const action: ActivityAction = patch.status === "completed" && cur.status !== "completed" ? "completed" : "updated";
    this.upsertEntity("project", { ...cur, ...patch, updatedAt: nowIso() }, action);
  };

  // ── shared entity ops ───────────────────────────────────────────────────
  setArchived = (kind: EntityKind, id: string, archived: boolean) => {
    const cur = this.find(kind, id);
    if (!cur) return;
    const next = { ...cur, archived, updatedAt: nowIso() } as typeof cur;
    if (kind === "idea") {
      const idea = next as Idea;
      idea.status = archived ? "archived" : idea.status === "archived" ? "inbox" : idea.status;
    }
    this.upsertEntity(kind, next, archived ? "archived" : "restored");
  };

  deleteEntity = (kind: EntityKind, id: string) => {
    const col = COLLECTION_OF[kind];
    const cur = this.find(kind, id);
    if (!cur) return;
    const d = this.state.data;
    const touched: Partial<Record<CollectionKey, Array<{ id: string }>>> = {};
    const strip = <T extends { id: string; linkIds?: string[] }>(list: T[], key: CollectionKey) =>
      list.map((x) => {
        if (x.linkIds?.includes(id)) {
          const n = { ...x, linkIds: x.linkIds.filter((l) => l !== id) };
          (touched[key] ??= []).push(n);
          return n;
        }
        return x;
      });
    let data: Snapshot = {
      ...d,
      pages: strip(d.pages, "pages"),
      ideas: strip(d.ideas, "ideas").map((x) => {
        if (x.projectId === id) {
          const n = { ...x, projectId: undefined };
          (touched.ideas ??= []).push(n);
          return n;
        }
        return x;
      }),
      links: strip(d.links, "links"),
      projects: d.projects.map((p) => {
        if (p.pageIds.includes(id) || p.ideaIds.includes(id)) {
          const n = { ...p, pageIds: p.pageIds.filter((x) => x !== id), ideaIds: p.ideaIds.filter((x) => x !== id) };
          (touched.projects ??= []).push(n);
          return n;
        }
        return p;
      }),
    };
    data = { ...data, [col]: (data[col] as Array<{ id: string }>).filter((x) => x.id !== id) } as Snapshot;
    if (touched[col]) touched[col] = touched[col]!.filter((x) => x.id !== id);
    const logged = this.log(data, kind, "deleted", id, (cur as { title: string }).title || "Untitled");
    data = logged.data;
    this.commit(data, { ...touched, activity: [logged.entry] }, { [col]: [id] });
  };

  /** Bidirectional-agnostic connection: stored on the source entity. */
  connect = (kind: EntityKind, id: string, targetId: string) => {
    if (id === targetId) return;
    const cur = this.find(kind, id);
    if (!cur) return;
    if (kind === "project") {
      const p = cur as Project;
      if (targetId.startsWith("pg") && !p.pageIds.includes(targetId))
        return this.updateProject(id, { pageIds: [...p.pageIds, targetId] });
      if (targetId.startsWith("id") && !p.ideaIds.includes(targetId))
        return this.updateProject(id, { ideaIds: [...p.ideaIds, targetId] });
      return;
    }
    const e = cur as Page | Idea | LinkItem;
    if (e.linkIds.includes(targetId)) return;
    const patch = { linkIds: [...e.linkIds, targetId] };
    if (kind === "page") this.updatePage(id, patch);
    else if (kind === "idea") this.updateIdea(id, patch);
    else this.updateLink(id, patch);
  };

  disconnect = (kind: EntityKind, id: string, targetId: string) => {
    const cur = this.find(kind, id);
    if (!cur) return;
    if (kind === "project") {
      const p = cur as Project;
      return this.updateProject(id, {
        pageIds: p.pageIds.filter((x) => x !== targetId),
        ideaIds: p.ideaIds.filter((x) => x !== targetId),
      });
    }
    const e = cur as Page | Idea | LinkItem;
    const patch = { linkIds: e.linkIds.filter((x) => x !== targetId) };
    if (kind === "page") this.updatePage(id, patch);
    else if (kind === "idea") this.updateIdea(id, patch);
    else this.updateLink(id, patch);
  };

  // ── conversations ───────────────────────────────────────────────────────
  createConversation = (init: Partial<Conversation> & { title: string; summary: string }): Conversation => {
    const t = nowIso();
    const c: Conversation = { id: uid("cv"), category: "General", source: "Manual", date: t, createdAt: t, updatedAt: t, ...init };
    let data: Snapshot = { ...this.state.data, conversations: [c, ...this.state.data.conversations] };
    const logged = this.log(data, "conversation", "created", c.id, c.title);
    data = logged.data;
    this.commit(data, { conversations: [c], activity: [logged.entry] });
    return c;
  };

  deleteConversation = (id: string) => {
    const data = { ...this.state.data, conversations: this.state.data.conversations.filter((c) => c.id !== id) };
    this.commit(data, {}, { conversations: [id] });
  };

  // ── profile / preferences / data ───────────────────────────────────────
  updateProfile = (patch: Partial<Profile>) => {
    this.commit({ ...this.state.data, profile: { ...this.state.data.profile, ...patch } }, {}, {}, true);
  };

  updatePreferences = (patch: Partial<Preferences>) => {
    this.commit({ ...this.state.data, preferences: { ...this.state.data.preferences, ...patch } }, {}, {}, true);
  };

  replaceAll = (snapshot: Snapshot) => {
    this.set({ data: migrate(snapshot) });
    this.queue({ ...emptyChanges(), replaceAll: true });
  };

  resetToDemo = () => {
    const seed = createSeed();
    seed.profile = this.state.data.profile;
    seed.preferences = this.state.data.preferences;
    this.replaceAll(seed);
  };

  clearAll = () => {
    const d = this.state.data;
    this.replaceAll({ ...d, pages: [], ideas: [], links: [], projects: [], conversations: [], activity: [] });
  };
}

/** Validates/normalises a snapshot from storage or an import file. */
export function migrate(input: Snapshot): Snapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid workspace file");
  const arr = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  return {
    version: SNAPSHOT_VERSION,
    pages: arr(input.pages).map((p) => ({ ...p, linkIds: p.linkIds ?? [], tags: p.tags ?? [], pinned: !!p.pinned, archived: !!p.archived })),
    ideas: arr(input.ideas).map((x) => ({ ...x, linkIds: x.linkIds ?? [], tags: x.tags ?? [], archived: !!x.archived })),
    links: arr(input.links).map((x) => ({ ...x, linkIds: x.linkIds ?? [], tags: x.tags ?? [], archived: !!x.archived })),
    projects: arr(input.projects).map((x) => ({
      ...x,
      pageIds: x.pageIds ?? [],
      ideaIds: x.ideaIds ?? [],
      tasks: x.tasks ?? [],
      tags: x.tags ?? [],
      archived: !!x.archived,
    })),
    conversations: arr(input.conversations),
    activity: arr(input.activity),
    profile: {
      name: input.profile?.name ?? "",
      email: input.profile?.email ?? "",
      role: input.profile?.role ?? "",
    },
    preferences: {
      reducedMotion: input.preferences?.reducedMotion ?? false,
      showIntro: input.preferences?.showIntro ?? true,
    },
  };
}
