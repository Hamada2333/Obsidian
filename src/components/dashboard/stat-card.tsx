"use client";

import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/charts/charts";
import type { StatSummary } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value]);
  return <>{n.toLocaleString()}</>;
}

export function StatCard({ stat, color, href, index }: { stat: StatSummary; color: string; href: string; index: number }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), { stiffness: 200, damping: 20 });
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(260px circle at ${glowX} ${glowY}, ${color}22, transparent 70%)`;
  const up = stat.delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      className="group"
    >
      <Link href={href} className="glass relative block overflow-hidden rounded-3xl p-5 transition-colors duration-300 hover:border-white/[0.14]">
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glow }}
        />
        <div className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}90, transparent)` }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-fg-subtle">{stat.label}</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              up ? "border-emerald/20 bg-emerald/[0.08] text-[#86efc1]" : "border-rose/20 bg-rose/[0.08] text-[#fda4b4]",
            )}
            title={stat.deltaLabel}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(stat.delta)}%
          </span>
        </div>
        <div className="relative mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[40px] font-light leading-none tracking-[-0.03em] text-fg tabular-nums">
              <CountUp value={stat.value} />
            </p>
            <p className="mt-2 text-[12px] text-fg-subtle">{stat.deltaLabel}</p>
          </div>
          <Sparkline data={stat.spark} color={color} className="h-10 w-28" />
        </div>
      </Link>
    </motion.div>
  );
}
