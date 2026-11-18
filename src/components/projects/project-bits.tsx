"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Accent, Project, ProjectStatus } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/types";
import { daysUntil, formatDate } from "@/lib/dates";
import { ACCENT_HEX, cn, uniq } from "@/lib/utils";
import { useBrain } from "@/lib/store/provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; dot: string }> = {
  planning: { label: "Planning", dot: "#5aa9ff" },
  active: { label: "Active", dot: "#e8b86b" },
  paused: { label: "Paused", dot: "#6b6a78" },
  completed: { label: "Completed", dot: "#3ddc97" },
};

export const ACCENTS: Accent[] = ["gold", "blue", "emerald", "violet", "rose"];

export function ProgressRing({ value, color, size = 56, stroke = 4 }: { value: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-medium tabular-nums text-fg">{value}%</span>
    </div>
  );
}

export function DeadlineLabel({ deadline, status, className }: { deadline?: string; status: ProjectStatus; className?: string }) {
  if (!deadline) return <span className={cn("text-fg-faint", className)}>No deadline</span>;
  const d = daysUntil(deadline);
  const done = status === "completed";
  const tone = done ? "text-fg-subtle" : d < 0 ? "text-rose" : d <= 7 ? "text-[#f59e6b]" : "text-fg-muted";
  const rel = done ? "" : d < 0 ? ` · ${-d}d overdue` : d === 0 ? " · today" : ` · ${d}d left`;
  return (
    <span className={cn(tone, className)}>
      {formatDate(deadline, { month: "short", day: "numeric", year: d > 300 ? "numeric" : undefined })}
      {rel}
    </span>
  );
}

export function ColorPicker({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Colour">
      {ACCENTS.map((a) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={value === a}
          aria-label={a}
          onClick={() => onChange(a)}
          className={cn("size-7 rounded-full border-2 transition", value === a ? "scale-110 border-white/80" : "border-transparent opacity-70 hover:opacity-100")}
          style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${ACCENT_HEX[a]} 55%)` }}
        />
      ))}
    </div>
  );
}

export function NewProjectForm({ onDone }: { onDone: (p?: Project) => void }) {
  const { data, actions } = useBrain();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState<Accent>("violet");
  const [tags, setTags] = useState<string[]>([]);
  const allTags = useMemo(() => uniq(data.projects.flatMap((p) => p.tags)), [data.projects]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onDone(actions.createProject({ title: title.trim(), description: description.trim(), status, deadline: deadline || undefined, color, tags }));
      }}
      className="space-y-4"
    >
      <Field label="Name">
        <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Launch the new website" />
      </Field>
      <Field label="Description">
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does done look like?" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Deadline">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="[color-scheme:dark]" />
        </Field>
      </div>
      <Field label="Tags">
        <TagInput value={tags} onChange={setTags} suggestions={allTags} />
      </Field>
      <Field label="Colour">
        <ColorPicker value={color} onChange={setColor} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
          Create project
        </Button>
      </div>
    </form>
  );
}
