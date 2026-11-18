"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Thin orbital arcs with travelling light, echoing the reference video. */
export function OrbitRings({ className, count = 4 }: { className?: string; count?: number }) {
  const rings = Array.from({ length: count }, (_, i) => i);
  return (
    <svg viewBox="-500 -500 1000 1000" className={cn("pointer-events-none", className)} aria-hidden>
      <defs>
        <linearGradient id="orbit-fade" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f3d7a4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="orbit-dot">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#f3d7a4" stopOpacity="0.8" />
          <stop offset="1" stopColor="#e8b86b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {rings.map((i) => {
        const r = 230 + i * 70;
        const dur = 60 + i * 30;
        return (
          <motion.g
            key={i}
            initial={{ rotate: i * 47 }}
            animate={{ rotate: i * 47 + (i % 2 ? -360 : 360) }}
            transition={{ duration: dur, ease: "linear", repeat: Infinity }}
          >
            <circle r={r} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
            <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r * Math.cos(Math.PI * 0.62)} ${-r * Math.sin(Math.PI * 0.62)}`} fill="none" stroke="url(#orbit-fade)" strokeWidth={1.2} />
            <circle cx={r * Math.cos(Math.PI * 0.62)} cy={-r * Math.sin(Math.PI * 0.62)} r={5} fill="url(#orbit-dot)" />
          </motion.g>
        );
      })}
    </svg>
  );
}
