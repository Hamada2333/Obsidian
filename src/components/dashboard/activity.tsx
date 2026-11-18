"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useBrain } from "@/lib/store/provider";
import { relativeTime } from "@/lib/dates";
import { hrefFor, KIND_LABEL } from "@/lib/utils";
import { KindIcon } from "@/components/shell/kind-icon";
import type { Activity } from "@/lib/types";

const VERB: Record<Activity["action"], string> = {
  created: "Created",
  updated: "Updated",
  archived: "Archived",
  restored: "Restored",
  deleted: "Deleted",
  converted: "Converted to project",
  completed: "Completed",
};

export function ActivityTimeline({ limit = 9 }: { limit?: number }) {
  const { data } = useBrain();
  const items = data.activity.slice(0, limit);
  if (!items.length) return <p className="py-8 text-center text-sm text-fg-subtle">Activity will appear here as you work.</p>;
  return (
    <ol className="relative">
      <span className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-white/10 via-white/[0.06] to-transparent" />
      {items.map((a, i) => {
        const href = a.action === "deleted" ? undefined : hrefFor(a.kind, a.entityId);
        const body = (
          <>
            <span className="relative z-[1] mt-0.5 rounded-xl bg-ink-900">
              <KindIcon kind={a.kind} boxed />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-fg-subtle">
                {VERB[a.action]} {KIND_LABEL[a.kind].toLowerCase()}
              </span>
              <span className="block truncate text-[14px] text-fg">{a.title}</span>
            </span>
            <span className="shrink-0 pt-0.5 text-[11.5px] tabular-nums text-fg-faint">{relativeTime(a.at)}</span>
          </>
        );
        return (
          <motion.li key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.5 }}>
            {href ? (
              <Link href={href} className="flex gap-3 rounded-xl py-2 pr-2 transition-colors hover:bg-white/[0.03]">
                {body}
              </Link>
            ) : (
              <div className="flex gap-3 py-2 pr-2 opacity-60">{body}</div>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
