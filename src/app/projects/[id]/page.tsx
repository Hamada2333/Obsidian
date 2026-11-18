"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, Check, FileText, GripVertical, Lightbulb, Orbit, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/dates";
import { ACCENT_HEX, cn, projectProgress, uid, uniq } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { EmptyState } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { EntityPicker } from "@/components/connections";
import { ConnectionsPanel } from "@/components/connections";
import { ColorPicker, DeadlineLabel, PROJECT_STATUS_META, ProgressRing } from "@/components/projects/project-bits";
import { excerpt } from "@/lib/utils";

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, actions } = useBrain();
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const p = data.projects.find((x) => x.id === id);
  const [title, setTitle] = useState(p?.title ?? "");
  const [desc, setDesc] = useState(p?.description ?? "");
  const [task, setTask] = useState("");
  const [picker, setPicker] = useState<null | "page" | "idea">(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    setTitle(p?.title ?? "");
    setDesc(p?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (!p || (title === p.title && desc === p.description)) return;
    const t = setTimeout(() => actions.updateProject(p.id, { title, description: desc }), 350);
    return () => clearTimeout(t);
  }, [title, desc, p, actions]);

  const allTags = useMemo(() => uniq(data.projects.flatMap((x) => x.tags)), [data.projects]);
  if (!p) {
    return (
      <EmptyState
        className="mt-12"
        icon={<Orbit className="size-6" />}
        title="Project not found"
        action={
          <Link href="/projects">
            <Button>Back to projects</Button>
          </Link>
        }
      />
    );
  }

  const color = ACCENT_HEX[p.color];
  const prog = projectProgress(p);
  const pages = p.pageIds.map((pid) => data.pages.find((x) => x.id === pid)).filter(Boolean) as typeof data.pages;
  const ideas = p.ideaIds.map((iid) => data.ideas.find((x) => x.id === iid)).filter(Boolean) as typeof data.ideas;

  const addTask = () => {
    if (!task.trim()) return;
    actions.updateProject(p.id, { tasks: [...p.tasks, { id: uid("tk"), title: task.trim(), done: false }] });
    setTask("");
  };
  const toggle = (tid: string) => {
    const tasks = p.tasks.map((t) => (t.id === tid ? { ...t, done: !t.done } : t));
    const allDone = tasks.length > 0 && tasks.every((t) => t.done);
    actions.updateProject(p.id, { tasks, ...(allDone && p.status !== "completed" ? { status: "completed" as const } : {}) });
    if (allDone && p.status !== "completed") toast({ title: "All tasks done — project completed 🎉" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Link href="/projects" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-fg-subtle hover:text-fg">
          <ArrowLeft className="size-3.5" /> Projects
        </Link>
        {p.archived && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-gold/20 bg-gold/[0.06] px-5 py-3 text-sm text-gold-soft">
            This project is archived.
            <Button size="sm" variant="primary" icon={<RotateCcw className="size-3.5" />} onClick={() => actions.setArchived("project", p.id, false)}>
              Restore
            </Button>
          </div>
        )}

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-[32px] p-7 md:p-9">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-subtle">
                <span className="size-1.5 rounded-full" style={{ background: PROJECT_STATUS_META[p.status].dot }} />
                {PROJECT_STATUS_META[p.status].label} · <DeadlineLabel deadline={p.deadline} status={p.status} />
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled project"
                aria-label="Project title"
                className="mt-3 w-full bg-transparent font-display text-[40px] leading-tight text-fg outline-none placeholder:text-fg-faint md:text-[50px]"
              />
              <Textarea autoGrow rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the outcome…" className="mt-2 border-transparent bg-transparent px-0 text-[15px] text-fg-muted hover:border-transparent focus:border-transparent focus:bg-transparent focus:shadow-none" />
            </div>
            <ProgressRing value={prog} color={color} size={104} stroke={6} />
          </div>
          {p.tasks.length === 0 && (
            <div className="relative mt-6">
              <Field label="Progress" hint={`${p.progress}% · add tasks to track automatically`}>
                <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => actions.updateProject(p.id, { progress: Number(e.target.value) })} className="w-full" style={{ accentColor: color }} aria-label="Progress" />
              </Field>
            </div>
          )}
        </motion.section>

        {/* Tasks */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-fg">Tasks</h2>
            <span className="text-[12px] text-fg-subtle">
              {p.tasks.filter((t) => t.done).length} of {p.tasks.length} done
            </span>
          </div>
          <div className="glass rounded-3xl p-2">
            <AnimatePresence initial={false}>
              {p.tasks.map((t, i) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn("group", dragIdx === i && "opacity-40")}
                >
                  <div
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragEnd={() => setDragIdx(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIdx === null || dragIdx === i) return;
                      const tasks = [...p.tasks];
                      const [m] = tasks.splice(dragIdx, 1);
                      tasks.splice(i, 0, m);
                      setDragIdx(i);
                      actions.updateProject(p.id, { tasks });
                    }}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.03]"
                  >
                    <GripVertical className="size-3.5 cursor-grab text-fg-faint opacity-0 group-hover:opacity-100" />
                    <button
                      onClick={() => toggle(t.id)}
                      aria-label={t.done ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`}
                      className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border transition", t.done ? "border-transparent" : "border-white/20 hover:border-white/40")}
                      style={t.done ? { background: color } : undefined}
                    >
                      {t.done && <Check className="size-3.5 text-ink-950" strokeWidth={3} />}
                    </button>
                    <input
                      value={t.title}
                      onChange={(e) => actions.updateProject(p.id, { tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)) })}
                      aria-label="Task"
                      className={cn("flex-1 bg-transparent text-[14px] outline-none", t.done ? "text-fg-subtle line-through decoration-white/20" : "text-fg")}
                    />
                    <IconButton label="Delete task" size="sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => actions.updateProject(p.id, { tasks: p.tasks.filter((x) => x.id !== t.id) })}>
                      <X className="size-3.5" />
                    </IconButton>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTask();
              }}
              className="flex items-center gap-3 px-3 py-2"
            >
              <Plus className="ml-[26px] size-4 text-fg-faint" />
              <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task and press Enter" aria-label="New task" className="h-8 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint" />
            </form>
          </div>
        </section>

        {/* Knowledge */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {(
            [
              ["page", "Pages", pages, FileText, "#5aa9ff"],
              ["idea", "Ideas", ideas, Lightbulb, "#e8b86b"],
            ] as const
          ).map(([kind, label, list, Icon, c]) => (
            <div key={kind} className="glass rounded-3xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg">
                  <Icon className="size-4" style={{ color: c }} /> {label}
                  <span className="text-[12px] text-fg-faint">{list.length}</span>
                </h3>
                <Button size="xs" variant="ghost" icon={<Plus className="size-3" />} onClick={() => setPicker(kind)}>
                  Connect
                </Button>
              </div>
              {list.length === 0 ? (
                <p className="py-4 text-[13px] text-fg-faint">No {label.toLowerCase()} connected.</p>
              ) : (
                <ul className="-mx-2 space-y-0.5">
                  {list.map((x) => (
                    <li key={x.id} className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                      <Link href={kind === "page" ? `/pages/${x.id}` : `/ideas?open=${x.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-fg">{x.title}</span>
                        <span className="block truncate text-[12px] text-fg-subtle">{"content" in x ? excerpt(x.content, 80) : x.description}</span>
                      </Link>
                      <IconButton label="Disconnect" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => actions.disconnect("project", p.id, x.id)}>
                        <X className="size-3.5" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </div>

      <aside className="space-y-5 lg:pt-12">
        <div className="glass space-y-4 rounded-3xl p-5">
          <Field label="Status">
            <Select value={p.status} onChange={(e) => actions.updateProject(p.id, { status: e.target.value as ProjectStatus })}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline">
            <Input type="date" value={p.deadline ?? ""} onChange={(e) => actions.updateProject(p.id, { deadline: e.target.value || undefined })} className="[color-scheme:dark]" />
          </Field>
          <Field label="Tags">
            <TagInput value={p.tags} onChange={(tags) => actions.updateProject(p.id, { tags })} suggestions={allTags} />
          </Field>
          <Field label="Colour">
            <ColorPicker value={p.color} onChange={(c) => actions.updateProject(p.id, { color: c })} />
          </Field>
          <dl className="grid grid-cols-2 gap-3 border-t hairline pt-4 text-[12px]">
            <div>
              <dt className="text-fg-faint">Created</dt>
              <dd className="mt-0.5 text-fg-muted">{formatDate(p.createdAt, { month: "short", day: "numeric", year: "numeric" })}</dd>
            </div>
            <div>
              <dt className="text-fg-faint">Updated</dt>
              <dd className="mt-0.5 text-fg-muted">{relativeTime(p.updatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="glass rounded-3xl p-5">
          <ConnectionsPanel id={p.id} kind="project" />
        </div>
        <div className="flex gap-2">
          {!p.archived && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Archive className="size-3.5" />}
              onClick={() => {
                actions.setArchived("project", p.id, true);
                toast({ title: "Project archived", action: { label: "Undo", onClick: () => actions.setArchived("project", p.id, false) } });
                router.push("/projects");
              }}
            >
              Archive
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            className="ml-auto"
            icon={<Trash2 className="size-3.5" />}
            onClick={async () => {
              if (await confirm({ title: `Delete “${p.title}”?`, description: "Connected pages and ideas are kept.", confirmLabel: "Delete", danger: true })) {
                actions.deleteEntity("project", p.id);
                toast({ title: "Project deleted" });
                router.push("/projects");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </aside>

      <EntityPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        kinds={picker ? [picker] : undefined}
        exclude={[...p.pageIds, ...p.ideaIds]}
        title={picker === "page" ? "Connect a page" : "Connect an idea"}
        onPick={(d) => {
          actions.connect("project", p.id, d.id);
          setPicker(null);
        }}
      />
    </div>
  );
}

export default withBrain(ProjectDetail);
