import type { EntityKind, Snapshot } from "./types";
import { buildEdges, degreeMap } from "./graph";
import { DAY, isoDay, startOfDay } from "./dates";
import { findDoc } from "./entities";

const WEEK = 7 * DAY;

function weekBuckets(weeks: number, now = new Date()) {
  const end = startOfDay(now).getTime() + DAY;
  return Array.from({ length: weeks }, (_, i) => {
    const to = end - (weeks - 1 - i) * WEEK;
    return { from: to - WEEK, to };
  });
}

const LIVE_KINDS: Array<[EntityKind, "pages" | "ideas" | "links" | "projects"]> = [
  ["page", "pages"],
  ["idea", "ideas"],
  ["link", "links"],
  ["project", "projects"],
];

export interface StatSummary {
  key: string;
  label: string;
  value: number;
  delta: number; // percentage vs previous period
  deltaLabel: string;
  spark: number[];
}

export function statCards(data: Snapshot, now = new Date()): StatSummary[] {
  const t = now.getTime();
  const created = (list: Array<{ createdAt: string; archived: boolean }>, from: number, to: number) =>
    list.filter((x) => {
      const c = new Date(x.createdAt).getTime();
      return c >= from && c < to;
    }).length;
  const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));
  const buckets = weekBuckets(10, now);

  const card = (key: string, label: string, list: Array<{ createdAt: string; archived: boolean }>): StatSummary => {
    const live = list.filter((x) => !x.archived);
    const cur = created(list, t - 30 * DAY, t + 1);
    const prev = created(list, t - 60 * DAY, t - 30 * DAY);
    let running = list.filter((x) => new Date(x.createdAt).getTime() < buckets[0].from).length;
    const spark = buckets.map((b) => (running += created(list, b.from, b.to)));
    return { key, label, value: live.length, delta: pct(cur, prev), deltaLabel: `+${cur} in 30 days`, spark };
  };

  const all = [...data.pages, ...data.ideas, ...data.links, ...data.projects];
  const updatedIn = (from: number, to: number) =>
    all.filter((x) => {
      const u = new Date(x.updatedAt).getTime();
      return !x.archived && u >= from && u < to;
    }).length;
  const thisWeek = updatedIn(t - 7 * DAY, t + 1);
  const lastWeek = updatedIn(t - 14 * DAY, t - 7 * DAY);
  const dayCounts = Array.from({ length: 10 }, (_, i) => {
    const to = startOfDay(now).getTime() + DAY - (9 - i) * DAY;
    return data.activity.filter((a) => {
      const at = new Date(a.at).getTime();
      return at >= to - DAY && at < to;
    }).length;
  });

  return [
    card("pages", "Pages", data.pages),
    card("ideas", "Ideas", data.ideas),
    card("links", "Links", data.links),
    {
      key: "week",
      label: "Updated this week",
      value: thisWeek,
      delta: pct(thisWeek, lastWeek),
      deltaLabel: `${lastWeek} the week before`,
      spark: dayCounts,
    },
  ];
}

/** Page create/update events per week, from the activity log. */
export function pagesUpdatedOverTime(data: Snapshot, weeks = 16, now = new Date()) {
  return weekBuckets(weeks, now).map((b) => ({
    label: new Date(b.from).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: data.activity.filter((a) => {
      if (a.kind !== "page" || (a.action !== "updated" && a.action !== "created")) return false;
      const at = new Date(a.at).getTime();
      return at >= b.from && at < b.to;
    }).length,
  }));
}

export function ideasByCategory(data: Snapshot) {
  const m = new Map<string, number>();
  for (const i of data.ideas) if (!i.archived) m.set(i.category, (m.get(i.category) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function ideasByStatus(data: Snapshot) {
  const m = new Map<string, number>();
  for (const i of data.ideas) m.set(i.status, (m.get(i.status) ?? 0) + 1);
  return m;
}

export function mostConnected(data: Snapshot, limit = 6) {
  const deg = degreeMap(buildEdges(data));
  return [...deg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, value]) => {
      const d = findDoc(data, id);
      return { id, label: d?.title ?? id, value, kind: d?.kind ?? "page", href: d?.href ?? "#" };
    });
}

/** Activity per day for a contribution-style heatmap. */
export function activityHeatmap(data: Snapshot, weeks = 20, now = new Date()) {
  const counts = new Map<string, number>();
  for (const a of data.activity) {
    const k = isoDay(new Date(a.at));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = startOfDay(now);
  const lastDay = new Date(today.getTime() + (6 - today.getDay()) * DAY); // end on Saturday
  const total = weeks * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(lastDay.getTime() - (total - 1 - i) * DAY);
    const key = isoDay(d);
    return { date: key, value: d > now ? -1 : (counts.get(key) ?? 0) };
  });
}

/** Cumulative knowledge (all entity kinds) per week. */
export function knowledgeGrowth(data: Snapshot, weeks = 26, now = new Date()) {
  const buckets = weekBuckets(weeks, now);
  return buckets.map((b) => {
    const row: Record<string, number | string> = {
      label: new Date(b.to - DAY).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    for (const [kind, col] of LIVE_KINDS) {
      row[kind] = (data[col] as Array<{ createdAt: string }>).filter((x) => new Date(x.createdAt).getTime() < b.to).length;
    }
    return row as { label: string } & Record<EntityKind, number>;
  });
}
