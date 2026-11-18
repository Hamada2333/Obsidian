export type EntityKind = "page" | "idea" | "link" | "project";

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  archived: boolean;
}

export interface Page extends BaseEntity {
  title: string;
  content: string; // markdown, supports [[Wiki links]]
  category: string;
  tags: string[];
  pinned: boolean;
  icon?: string;
  /** Explicit connections to any entity id (pages, ideas, projects, links). */
  linkIds: string[];
  summary?: string; // AI generated
}

export const IDEA_STATUSES = ["inbox", "thinking", "in-progress", "completed", "archived"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export interface Idea extends BaseEntity {
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: IdeaStatus;
  projectId?: string;
  linkIds: string[];
}

export interface LinkItem extends BaseEntity {
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  linkIds: string[];
}

export const PROJECT_STATUSES = ["planning", "active", "paused", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export interface Project extends BaseEntity {
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0-100, used when no tasks exist
  deadline?: string; // YYYY-MM-DD
  color: Accent;
  tags: string[];
  pageIds: string[];
  ideaIds: string[];
  tasks: Task[];
}

export interface Conversation {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string; // ISO
  source: string; // e.g. "Claude", "Meeting", "Manual"
  transcript?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction = "created" | "updated" | "archived" | "restored" | "deleted" | "converted" | "completed";

export interface Activity {
  id: string;
  kind: EntityKind | "conversation";
  action: ActivityAction;
  entityId: string;
  title: string;
  at: string;
}

export type Accent = "gold" | "blue" | "emerald" | "violet" | "rose";

export interface Profile {
  name: string;
  email: string;
  role: string;
}

export interface Preferences {
  reducedMotion: boolean;
  showIntro: boolean;
}

export interface Snapshot {
  version: number;
  pages: Page[];
  ideas: Idea[];
  links: LinkItem[];
  projects: Project[];
  conversations: Conversation[];
  activity: Activity[];
  profile: Profile;
  preferences: Preferences;
}

export type CollectionKey = "pages" | "ideas" | "links" | "projects" | "conversations" | "activity";

export type AnyEntity =
  | ({ kind: "page" } & Page)
  | ({ kind: "idea" } & Idea)
  | ({ kind: "link" } & LinkItem)
  | ({ kind: "project" } & Project);
