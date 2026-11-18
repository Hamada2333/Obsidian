"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-built SVG charts (no charting dependency). Conventions:
 *  - 2px lines, thin bars with 4px rounded data ends, recessive grid.
 *  - Every plotted chart has a hover layer (crosshair or per-mark tooltip).
 *  - Text uses text tokens; colour only marks identity.
 *  - Series colours are a validated dark-mode categorical set (CVD-safe).
 */
export const SERIES = { page: "#3d8fe8", idea: "#b8822f", project: "#8a6be6", link: "#1fa874" } as const;
export const SERIES_ORDER = ["page", "idea", "project", "link"] as const;
export const SERIES_LABEL: Record<keyof typeof SERIES, string> = { page: "Pages", idea: "Ideas", project: "Projects", link: "Links" };
const GOLD = "#d9a556";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Tip({ x, y, children, containerW }: { x: number; y: number; children: ReactNode; containerW: number }) {
  const flip = x > containerW - 170;
  return (
    <div
      className="glass-strong pointer-events-none absolute z-10 min-w-[120px] rounded-xl px-3 py-2 text-[12px] shadow-xl"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerW - x + 12 : undefined, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  );
}

// ── Sparkline (stat tiles) ────────────────────────────────────────────────
export function Sparkline({ data, color, className }: { data: number[]; color: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const w = 120, h = 36;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("overflow-visible", className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.5} fill={color} />
    </svg>
  );
}

// ── Area chart (single series, crosshair) ────────────────────────────────
export function AreaChart({ data, height = 200, label, color = GOLD }: { data: Array<{ label: string; value: number }>; height?: number; label: string; color?: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const pad = { l: 28, r: 8, t: 10, b: 22 };
  const w = Math.max(0, W - pad.l - pad.r), h = height - pad.t - pad.b;
  const max = Math.max(4, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * w;
  const y = (v: number) => pad.t + h - (v / nice) * h;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const ticks = [0, nice / 2, nice];

  return (
    <div ref={ref} className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
      {W > 0 && (
        <svg width={W} height={height} role="img" aria-label={label}>
          <defs>
            <linearGradient id={`ag-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.28" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.05)" />
              <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" className="fill-fg-faint text-[10px]">{t}</text>
            </g>
          ))}
          {data.map((d, i) =>
            i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === data.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="fill-fg-faint text-[10px]">
                {d.label}
              </text>
            ) : null,
          )}
          <motion.path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ag-${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
          <motion.path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill={color} stroke="#0b0b10" strokeWidth={2} />
            </g>
          )}
          <rect
            x={pad.l}
            y={0}
            width={w}
            height={height}
            fill="transparent"
            onMouseMove={(e) => {
              const rx = e.clientX - (e.currentTarget.ownerSVGElement!.getBoundingClientRect().left + pad.l);
              setHover(Math.max(0, Math.min(data.length - 1, Math.round((rx / w) * (data.length - 1)))));
            }}
          />
        </svg>
      )}
      {hover !== null && (
        <Tip x={x(hover)} y={y(data[hover].value)} containerW={W}>
          <p className="text-fg-subtle">Week of {data[hover].label}</p>
          <p className="mt-0.5 font-medium text-fg">
            {data[hover].value} {label.toLowerCase()}
          </p>
        </Tip>
      )}
    </div>
  );
}

// ── Multi-line chart (knowledge growth) ──────────────────────────────────
type SeriesKey = keyof typeof SERIES;
export function MultiLineChart({ data, height = 220, label }: { data: Array<{ label: string } & Record<SeriesKey, number>>; height?: number; label: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 30, r: 64, t: 12, b: 22 };
  const w = Math.max(0, W - pad.l - pad.r), h = height - pad.t - pad.b;
  const max = Math.max(4, ...data.flatMap((d) => SERIES_ORDER.map((k) => d[k])));
  const nice = Math.ceil(max / 10) * 10;
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * w;
  const y = (v: number) => pad.t + h - (v / nice) * h;
  // Direct end labels, nudged apart to avoid collisions.
  const ends = SERIES_ORDER.map((k) => ({ k, y: y(data.at(-1)?.[k] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
        {SERIES_ORDER.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
            <span className="h-[2px] w-3 rounded-full" style={{ background: SERIES[k] }} />
            {SERIES_LABEL[k]}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        {W > 0 && data.length > 0 && (
          <svg width={W} height={height} role="img" aria-label={label}>
            {[0, nice / 2, nice].map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.05)" />
                <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" className="fill-fg-faint text-[10px]">{t}</text>
              </g>
            ))}
            {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-fg-faint text-[10px]">
                {data[i].label}
              </text>
            ))}
            {SERIES_ORDER.map((k, si) => (
              <motion.path
                key={k}
                d={data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join(" ")}
                fill="none"
                stroke={SERIES[k]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: si * 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
            {ends.map((e) => (
              <text key={e.k} x={pad.l + w + 8} y={e.y + 3.5} className="fill-fg-muted text-[10.5px]">
                {SERIES_LABEL[e.k]}
              </text>
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
                {SERIES_ORDER.map((k) => (
                  <circle key={k} cx={x(hover)} cy={y(data[hover][k])} r={4.5} fill={SERIES[k]} stroke="#0b0b10" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              x={pad.l}
              y={0}
              width={w}
              height={height}
              fill="transparent"
              onMouseMove={(e) => {
                const rx = e.clientX - (e.currentTarget.ownerSVGElement!.getBoundingClientRect().left + pad.l);
                setHover(Math.max(0, Math.min(data.length - 1, Math.round((rx / w) * (data.length - 1)))));
              }}
            />
          </svg>
        )}
        {hover !== null && (
          <Tip x={x(hover)} y={pad.t + 10} containerW={W}>
            <p className="mb-1 text-fg-subtle">{data[hover].label}</p>
            {SERIES_ORDER.map((k) => (
              <p key={k} className="flex items-center justify-between gap-4 text-fg">
                <span className="flex items-center gap-1.5 text-fg-muted">
                  <span className="size-2 rounded-full" style={{ background: SERIES[k] }} />
                  {SERIES_LABEL[k]}
                </span>
                <span className="font-medium tabular-nums">{data[hover][k]}</span>
              </p>
            ))}
          </Tip>
        )}
      </div>
    </div>
  );
}

// ── Horizontal bar list ──────────────────────────────────────────────────
export function BarList({ data, color = GOLD, unit, empty = "No data yet" }: { data: Array<{ label: string; value: number; href?: string; color?: string }>; color?: string; unit: string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-fg-subtle">{empty}</p>;
  return (
    <ul className="space-y-2.5" onMouseLeave={() => setHover(null)}>
      {data.map((d, i) => {
        const inner = (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className={cn("truncate transition-colors", hover === i ? "text-fg" : "text-fg-muted")}>{d.label}</span>
              <span className="shrink-0 tabular-nums text-fg-subtle">
                {d.value} <span className={cn("text-fg-faint transition-opacity", hover === i ? "opacity-100" : "opacity-0")}>{unit}</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: d.color ?? color, opacity: hover === null || hover === i ? 1 : 0.45 }}
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / max) * 100}%` }}
                transition={{ duration: 1, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </>
        );
        return (
          <li key={d.label + i} onMouseEnter={() => setHover(i)} title={`${d.label}: ${d.value} ${unit}`}>
            {d.href ? (
              <Link href={d.href} className="block rounded-lg">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Contribution heatmap ─────────────────────────────────────────────────
const HEAT = ["rgba(255,255,255,0.04)", "#4a3618", "#7a5622", "#ae7c33", "#e0aa5c"];
export function Heatmap({ cells }: { cells: Array<{ date: string; value: number }> }) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...cells.map((c) => c.value));
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, 1 + Math.floor((v / max) * 3.999)));
  const weeks = Math.ceil(cells.length / 7);
  const total = cells.reduce((n, c) => n + Math.max(0, c.value), 0);
  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)", gridAutoFlow: "column" }} role="img" aria-label={`${total} actions over ${weeks} weeks`}>
        {cells.map((c, i) => (
          <div
            key={c.date}
            onMouseEnter={(e) => {
              const r = ref.current!.getBoundingClientRect();
              const b = e.currentTarget.getBoundingClientRect();
              setHover({ i, x: b.left - r.left + b.width / 2, y: b.top - r.top });
            }}
            className={cn("aspect-square rounded-[3px] transition-transform", c.value < 0 ? "opacity-0" : "hover:scale-125")}
            style={{ background: HEAT[level(c.value)] }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-fg-faint">
        <span>{total} actions</span>
        <span className="flex items-center gap-1">
          Less
          {HEAT.map((c) => (
            <span key={c} className="size-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          More
        </span>
      </div>
      {hover && cells[hover.i].value >= 0 && (
        <div className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11.5px]" style={{ left: hover.x, top: hover.y - 6 }}>
          <span className="font-medium text-fg">{cells[hover.i].value} actions</span>{" "}
          <span className="text-fg-subtle">{new Date(`${cells[hover.i].date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>
      )}
    </div>
  );
}

// ── Donut (ideas pipeline by status) ─────────────────────────────────────
export function Donut({ data, size = 132, centerLabel }: { data: Array<{ label: string; value: number; color: string }>; size?: number; centerLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  let acc = 0;
  const gap = 3;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={centerLabel}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <motion.circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? 13 : 10}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-acc}
                initial={{ opacity: 0 }}
                animate={{ opacity: hover === null || hover === i ? 1 : 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", transition: "stroke-width .2s" }}
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-fg">{hover === null ? total : data[hover].value}</span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">{hover === null ? centerLabel : data[hover].label}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex items-center gap-2 text-fg-muted">
              <span className="size-2 rounded-full" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="tabular-nums text-fg-subtle">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
