"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CheckSquare, FileText, LayoutGrid, Lightbulb, List, Orbit, Plus } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/types";
import { relativeTime } from "@/lib/dates";
import { ACCENT_HEX, projectProgress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, PageHeader, Segmented } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { Chips, FilterSearch } from "@/components/common/filter-bar";
import { DeadlineLabel, NewProjectForm, PROJECT_STATUS_META, ProgressRing } from "@/components/projects/project-bits";

function ProjectCard({ p, i }: { p: Project; i: number }) {
  const color = ACCENT_HEX[p.color];
  const prog = projectProgress(p);
  const done = p.tasks.filter((t) => t.done).length;
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.45, delay: Math.min(i, 10) * 0.04, ease: [0.16, 1, 0.3, 1] }}>
      <Link href={`/projects/${p.id}`} className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14]">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-40" style={{ background: color }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
              <span className="size-1.5 rounded-full" style={{ background: PROJECT_STATUS_META[p.status].dot }} />
              {PROJECT_STATUS_META[p.status].label}
            </span>
            <h3 className="mt-2 text-[18px] font-medium leading-snug tracking-[-0.01em] text-fg">{p.title || "Untitled project"}</h3>
          </div>
          <ProgressRing value={prog} color={color} />
        </div>
        <p className="relative mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{p.description || "No description yet."}</p>
        <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="relative mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-[12px] text-fg-subtle">
          <DeadlineLabel deadline={p.deadline} status={p.status} />
          <span className="flex items-center gap-1">
            <FileText className="size-3" /> {p.pageIds.length}
          </span>
          <span className="flex items-center gap-1">
            <Lightbulb className="size-3" /> {p.ideaIds.length}
          </span>
          {p.tasks.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" /> {done}/{p.tasks.length}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function ProjectsView() {
  const { data } = useBrain();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useFeedback();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"deadline" | "updated" | "progress">("deadline");
  const creating = params.get("new") === "1";

  const live = useMemo(() => data.projects.filter((p) => !p.archived), [data.projects]);
  const projects = useMemo(() => {
    let list = live;
    if (status) list = list.filter((p) => p.status === status);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((p) => `${p.title} ${p.description} ${p.tags.join(" ")}`.toLowerCase().includes(t));
    }
    const s = [...list];
    if (sort === "deadline") s.sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    else if (sort === "progress") s.sort((a, b) => projectProgress(b) - projectProgress(a));
    else s.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return s;
  }, [live, status, q, sort]);

  const counts = useMemo(() => {
    const m = new Map<ProjectStatus, number>();
    for (const p of live) m.set(p.status, (m.get(p.status) ?? 0) + 1);
    return m;
  }, [live]);
  const avg = live.length ? Math.round(live.reduce((n, p) => n + projectProgress(p), 0) / live.length) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Projects"
        description={`${counts.get("active") ?? 0} active · ${counts.get("planning") ?? 0} planning · average progress ${avg}%`}
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => router.replace("/projects?new=1", { scroll: false })}>
            New project
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterSearch value={q} onChange={setQ} placeholder="Filter projects…" />
        <div className="w-40">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort projects" className="h-9 text-[13px]">
            <option value="deadline">By deadline</option>
            <option value="updated">Recently updated</option>
            <option value="progress">By progress</option>
          </Select>
        </div>
        <Segmented
          className="ml-auto"
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: <LayoutGrid className="size-3.5" />, title: "Grid view" },
            { value: "list", label: <List className="size-3.5" />, title: "List view" },
          ]}
        />
      </div>
      <div className="mb-6">
        <Chips value={status} onChange={setStatus} allLabel="All projects" options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_META[s].label, count: counts.get(s) ?? 0 }))} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<Orbit className="size-6" />}
          title={live.length ? "No projects match" : "No projects yet"}
          description="Projects turn ideas into outcomes. Track progress, deadlines and the knowledge behind them."
          action={
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => router.replace("/projects?new=1")}>
              New project
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {projects.map((p, i) => (
              <ProjectCard key={p.id} p={p} i={i} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b hairline text-[11px] uppercase tracking-[0.12em] text-fg-faint">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Progress</th>
                <th className="px-3 py-3 font-medium">Deadline</th>
                <th className="px-3 py-3 font-medium">Linked</th>
                <th className="px-5 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const prog = projectProgress(p);
                return (
                  <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="cursor-pointer border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full" style={{ background: ACCENT_HEX[p.color] }} />
                        <Link href={`/projects/${p.id}`} className="text-[14px] text-fg">
                          {p.title}
                        </Link>
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-fg-muted">{PROJECT_STATUS_META[p.status].label}</td>
                    <td className="px-3 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="block h-full rounded-full" style={{ width: `${prog}%`, background: ACCENT_HEX[p.color] }} />
                        </span>
                        <span className="tabular-nums text-fg-subtle">{prog}%</span>
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <DeadlineLabel deadline={p.deadline} status={p.status} />
                    </td>
                    <td className="px-3 py-3.5 text-fg-subtle">
                      {p.pageIds.length} pages · {p.ideaIds.length} ideas
                    </td>
                    <td className="px-5 py-3.5 text-right text-fg-faint">{relativeTime(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating} onClose={() => router.replace("/projects", { scroll: false })} title="New project" description="Give it a name — you can add tasks and connect knowledge next.">
        <NewProjectForm
          onDone={(p) => {
            if (p) {
              toast({ title: "Project created", description: p.title });
              router.push(`/projects/${p.id}`);
            } else router.replace("/projects", { scroll: false });
          }}
        />
      </Modal>
    </div>
  );
}

const Gated = withBrain(ProjectsView);
export default function ProjectsRoute() {
  return (
    <Suspense>
      <Gated />
    </Suspense>
  );
}
