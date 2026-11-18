"use client";

import { Suspense, useMemo } from "react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { statCards } from "@/lib/analytics";
import { ACCENT_HEX } from "@/lib/utils";
import { HomeHero } from "@/components/dashboard/hero";
import { HomeSearch } from "@/components/dashboard/home-search";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalyticsGrid } from "@/components/dashboard/analytics";
import { ActivityTimeline } from "@/components/dashboard/activity";
import { ConversationSummaries } from "@/components/dashboard/conversations";
import { Panel } from "@/components/ui/surface";

const CARD_META = [
  { color: ACCENT_HEX.blue, href: "/pages" },
  { color: ACCENT_HEX.gold, href: "/ideas" },
  { color: ACCENT_HEX.emerald, href: "/links" },
  { color: ACCENT_HEX.violet, href: "/pages?sort=updated" },
];

function HomePage() {
  const { data } = useBrain();
  const stats = useMemo(() => statCards(data), [data]);
  return (
    <div className="space-y-10">
      <div>
        <HomeHero />
        <HomeSearch />
      </div>

      <section aria-label="Statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.key} stat={s} color={CARD_META[i].color} href={CARD_META[i].href} index={i} />
        ))}
      </section>

      <section aria-label="Analytics">
        <div className="mb-4">
          <h2 className="text-[15px] font-medium text-fg">Knowledge analytics</h2>
          <p className="mt-0.5 text-[12.5px] text-fg-subtle">Computed live from your workspace</p>
        </div>
        <AnalyticsGrid />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="Recent activity" subtitle="Everything that changed, newest first">
          <ActivityTimeline limit={10} />
        </Panel>
        <div className="glass rounded-3xl p-5">
          <Suspense>
            <ConversationSummaries />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default withBrain(HomePage);
