"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import type { EntityKind } from "@/lib/types";
import { allDocs } from "@/lib/entities";
import { relativeTime } from "@/lib/dates";
import { KIND_LABEL, excerpt } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { KindIcon } from "@/components/shell/kind-icon";

type Filter = "all" | EntityKind;

function ArchiveView() {
  const { data, actions } = useBrain();
  const { confirm, toast } = useFeedback();
  const [filter, setFilter] = useState<Filter>("all");
  const archived = useMemo(
    () =>
      allDocs(data, { includeArchived: true })
        .filter((d) => d.archived && d.kind !== "conversation")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data],
  );
  const shown = filter === "all" ? archived : archived.filter((d) => d.kind === filter);
  const count = (k: EntityKind) => archived.filter((d) => d.kind === k).length;

  return (
    <div>
      <PageHeader
        eyebrow="Cold storage"
        title="Archive"
        description="Archived items leave your search, graph and dashboards but are never lost. Restore them any time."
        actions={
          archived.length > 0 && (
            <Button
              variant="danger"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (await confirm({ title: `Permanently delete ${shown.length} item${shown.length === 1 ? "" : "s"}?`, description: "This cannot be undone.", confirmLabel: "Delete forever", danger: true })) {
                  for (const d of shown) actions.deleteEntity(d.kind as EntityKind, d.id);
                  toast({ title: "Archive emptied" });
                }
              }}
            >
              Empty {filter === "all" ? "archive" : `${KIND_LABEL[filter].toLowerCase()}s`}
            </Button>
          )
        }
      />
      <Segmented
        className="mb-6"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `All ${archived.length}` },
          { value: "page", label: `Pages ${count("page")}` },
          { value: "idea", label: `Ideas ${count("idea")}` },
          { value: "link", label: `Links ${count("link")}` },
          { value: "project", label: `Projects ${count("project")}` },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState icon={<Archive className="size-6" />} title="Nothing archived" description="When you archive pages, ideas, links or projects they rest here." />
      ) : (
        <div className="glass rounded-3xl p-2">
          <AnimatePresence initial={false}>
            {shown.map((d) => (
              <motion.div key={d.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/[0.03]">
                <KindIcon kind={d.kind} boxed />
                <Link href={d.href} className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] text-fg">{d.title}</span>
                  <span className="block truncate text-[12.5px] text-fg-subtle">
                    {KIND_LABEL[d.kind]} · archived {relativeTime(d.updatedAt)} {excerpt(d.body, 60) && `· ${excerpt(d.body, 60)}`}
                  </span>
                </Link>
                <Button
                  size="sm"
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={() => {
                    actions.setArchived(d.kind as EntityKind, d.id, false);
                    toast({ title: "Restored", description: d.title });
                  }}
                >
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${d.title} forever`}
                  icon={<Trash2 className="size-3.5" />}
                  onClick={async () => {
                    if (await confirm({ title: `Delete “${d.title}” forever?`, confirmLabel: "Delete", danger: true })) actions.deleteEntity(d.kind as EntityKind, d.id);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default withBrain(ArchiveView);
