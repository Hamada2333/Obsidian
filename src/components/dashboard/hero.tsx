"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BlackHole, DEFAULT_PARAMS, type BlackHoleParams } from "@/components/cosmos/black-hole";
import { useBrain } from "@/lib/store/provider";
import { daysUntil, formatDate, greetingFor, relativeTime, weekdayName, DAY } from "@/lib/dates";
import { projectProgress, cn } from "@/lib/utils";

const LAST_VISIT_KEY = "second-brain:last-visit";

function useLastVisit() {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    try {
      const prev = localStorage.getItem(LAST_VISIT_KEY);
      setLast(prev);
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch {}
  }, []);
  return last;
}

export function HomeHero() {
  const { data } = useBrain();
  const lastVisit = useLastVisit();
  const params = useRef<BlackHoleParams>({ ...DEFAULT_PARAMS, zoom: 1.35, offsetX: 3.9, offsetY: 0, spin: 0.8 });
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => {
      setMobile(mq.matches);
      params.current.offsetX = mq.matches ? 0 : 3.9;
      params.current.offsetY = 0;
      params.current.zoom = mq.matches ? 1.25 : 1.35;
    };
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const now = new Date();
  const name = data.profile.name || "there";

  const info = useMemo(() => {
    const since = lastVisit ? new Date(lastVisit).getTime() : Date.now() - 7 * DAY;
    const weekAgo = Date.now() - 7 * DAY;
    const live = data.pages.filter((p) => !p.archived);
    const updatedWeek = live.filter((p) => new Date(p.updatedAt).getTime() > weekAgo && p.updatedAt !== p.createdAt).length;
    const newPages = live.filter((p) => new Date(p.createdAt).getTime() > weekAgo).length;
    const changedSince = [...data.pages, ...data.ideas, ...data.projects].filter((x) => new Date(x.updatedAt).getTime() > since).length;
    const inbox = data.ideas.filter((i) => i.status === "inbox").length;
    const active = data.projects.filter((p) => !p.archived && p.status === "active");
    const upcoming = data.projects
      .filter((p) => !p.archived && p.deadline && p.status !== "completed" && daysUntil(p.deadline) >= -3)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
    const coming = upcoming.slice(0, 3).map((p) => {
      const open = p.tasks.find((t) => !t.done);
      return { id: p.id, date: p.deadline!, days: daysUntil(p.deadline!), text: open ? `${p.title}: ${open.title}` : p.title };
    });
    const next = upcoming[0];
    const lines: string[] = [];
    if (active.length) lines.push(`You have ${active.length} active project${active.length > 1 ? "s" : ""}${next ? ` and ${next.title} is due ${daysUntil(next.deadline!) <= 0 ? "now" : `in ${daysUntil(next.deadline!)} days`} at ${projectProgress(next)}% complete` : ""}.`);
    if (updatedWeek) lines.push(`${updatedWeek} page${updatedWeek > 1 ? "s were" : " was"} refined this week${newPages ? `, with ${newPages} new one${newPages > 1 ? "s" : ""} added` : ""}.`);
    if (inbox) lines.push(`${inbox} idea${inbox > 1 ? "s are" : " is"} waiting in your inbox for a decision.`);
    const lastConv = [...data.conversations].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (lastConv) lines.push(`Your latest conversation, “${lastConv.title}”, was ${relativeTime(lastConv.date)}.`);
    if (!lines.length) lines.push("Your second brain is quiet. Capture a page or an idea to get started.");
    return { lines, coming, updatedWeek, newPages, changedSince, convCount: data.conversations.length };
  }, [data, lastVisit]);

  const clusters = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data.pages) if (!p.archived) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data.pages]);
  // Positions (percent of the canvas) arranged around the hole, echoing a star chart.
  const SPOTS = [
    [62, 18],
    [83, 30],
    [88, 64],
    [70, 82],
    [44, 78],
    [41, 26],
  ];

  return (
    <section className="relative -mx-4 overflow-hidden rounded-none border-y border-white/[0.06] md:mx-0 md:rounded-[32px] md:border">
      <BlackHole key={mobile ? "m" : "d"} className={mobile ? "absolute inset-x-0 top-0 h-[360px]" : "absolute inset-0"} params={params} quality={mobile ? 0.6 : 0.7} paused={data.preferences.reducedMotion} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,5,0.92)_0%,rgba(3,3,5,0.65)_32%,transparent_60%)] max-[900px]:bg-[linear-gradient(0deg,#030305_55%,transparent_72%)]" />

      {/* Constellation labels */}
      <div className="absolute inset-0 hidden min-[900px]:block">
        {clusters.map(([cat, n], i) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.12, duration: 0.9 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%` }}
          >
            <Link href={`/pages?category=${encodeURIComponent(cat)}`} className="group flex flex-col items-center text-center">
              <span className="mb-1.5 size-1.5 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,236,200,0.6)] transition-transform group-hover:scale-150" />
              <span className="text-[12px] font-medium text-fg/90 transition-colors group-hover:text-gold-soft">{cat}</span>
              <span className="text-[10.5px] text-fg-subtle">{n} pages</span>
            </Link>
          </motion.div>
        ))}
        <div className="absolute left-[64%] top-[60%] -translate-x-1/2">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-fg-muted backdrop-blur">Home</span>
        </div>
      </div>

      <div className="relative flex min-h-[560px] flex-col justify-end p-6 max-[900px]:pt-[300px] md:p-10 min-[900px]:justify-center">
        <div className="max-w-[440px]">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold/80">
            {greetingFor(now)} · {formatDate(now.toISOString(), { weekday: "long", month: "long", day: "numeric" })}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 font-display text-[44px] leading-[1.02] tracking-[-0.01em] text-fg md:text-[56px]"
          >
            Happy {weekdayName(now)}, <span className="italic text-gradient-gold">{name}.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-2 text-[12px] text-fg-subtle">
            {lastVisit ? `Since you were last here ${relativeTime(lastVisit)} · ${info.changedSince} changes` : "Welcome to your second brain"}
          </motion.p>
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.8 }} className="mt-5 text-[14.5px] leading-relaxed text-fg-muted">
            {info.lines.join(" ")}
          </motion.p>

          {info.coming.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6">
              <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-fg-faint">Coming up</p>
              <ul className="space-y-2">
                {info.coming.map((c) => (
                  <li key={c.id}>
                    <Link href={`/projects/${c.id}`} className="group flex gap-4 text-[13px]">
                      <span className={cn("w-16 shrink-0 tabular-nums", c.days <= 3 ? "text-[#f59e6b]" : "text-gold/80")}>
                        {c.days < 0 ? "Overdue" : c.days <= 7 ? `by ${formatDate(c.date)}` : formatDate(c.date)}
                      </span>
                      <span className="text-fg-muted transition-colors group-hover:text-fg">{c.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
            <Link href="/pages?sort=updated" className="group inline-flex items-center gap-1 text-[#7cc4a5] hover:text-emerald">
              {info.updatedWeek} pages updated <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/pages?sort=created" className="group inline-flex items-center gap-1 text-[#7cc4a5] hover:text-emerald">
              {info.newPages} new pages <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#conversations" className="group inline-flex items-center gap-1 text-[#7cc4a5] hover:text-emerald">
              {info.convCount} conversation records <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
