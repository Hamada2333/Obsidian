"use client";

import { useMemo } from "react";
import { useBrain } from "@/lib/store/provider";
import { activityHeatmap, ideasByCategory, ideasByStatus, knowledgeGrowth, mostConnected, pagesUpdatedOverTime } from "@/lib/analytics";
import { AreaChart, BarList, Donut, Heatmap, MultiLineChart, SERIES } from "@/components/charts/charts";
import { Panel } from "@/components/ui/surface";

const STATUS_COLORS: Record<string, string> = { inbox: SERIES.page, thinking: SERIES.idea, "in-progress": SERIES.project, completed: SERIES.link, archived: "#4b4b57" };
const STATUS_LABEL: Record<string, string> = { inbox: "Inbox", thinking: "Thinking", "in-progress": "In progress", completed: "Completed", archived: "Archived" };

export function AnalyticsGrid() {
  const { data } = useBrain();
  const a = useMemo(
    () => ({
      updated: pagesUpdatedOverTime(data),
      byCat: ideasByCategory(data),
      byStatus: ideasByStatus(data),
      connected: mostConnected(data),
      heat: activityHeatmap(data, 30),
      growth: knowledgeGrowth(data),
    }),
    [data],
  );
  const totalUpdates = a.updated.reduce((n, d) => n + d.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Pages updated over time" subtitle={`${totalUpdates} edits across 16 weeks`} className="lg:col-span-2" delay={0.05}>
        <AreaChart data={a.updated} label="Page edits" height={210} />
      </Panel>
      <Panel title="Ideas by category" subtitle={`${a.byCat.reduce((n, d) => n + d.value, 0)} active ideas`} delay={0.1}>
        <BarList data={a.byCat.slice(0, 6).map((d) => ({ ...d, href: `/ideas?category=${encodeURIComponent(d.label)}` }))} unit="ideas" />
      </Panel>
      <Panel title="Knowledge growth" subtitle="Cumulative items, last 26 weeks" className="lg:col-span-2" delay={0.15}>
        <MultiLineChart data={a.growth} label="Knowledge growth by type" height={210} />
      </Panel>
      <Panel title="Most connected" subtitle="Links, wiki-links & project ties" delay={0.2}>
        <BarList data={a.connected.map((d) => ({ label: d.label, value: d.value, href: d.href }))} unit="connections" color="#8a6be6" empty="Link pages together to see hubs." />
      </Panel>
      <Panel title="Creation activity" subtitle="Every create, edit and capture" className="lg:col-span-2" delay={0.25}>
        <Heatmap cells={a.heat} />
      </Panel>
      <Panel title="Idea pipeline" subtitle="By status" delay={0.3}>
        <Donut
          centerLabel="ideas"
          data={["inbox", "thinking", "in-progress", "completed", "archived"].map((s) => ({ label: STATUS_LABEL[s], value: a.byStatus.get(s) ?? 0, color: STATUS_COLORS[s] }))}
        />
      </Panel>
    </div>
  );
}
