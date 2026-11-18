"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Snapshot, EntityKind } from "@/lib/types";
import { buildEdges } from "@/lib/graph";
import { allDocs, type Doc } from "@/lib/entities";

/**
 * Force-directed knowledge graph on a 2D canvas.
 * Layout: a gold "core" at the centre, category hubs orbiting it, and every
 * page / idea / link / project attached to its hub and to each other.
 * O(n²) repulsion is fine for a personal brain (hundreds of nodes) and keeps
 * the code dependency-free.
 */

export type NodeKind = EntityKind | "hub" | "core";
export interface GNode {
  id: string;
  kind: NodeKind;
  title: string;
  hubKind?: EntityKind;
  doc?: Doc;
  count?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  degree: number;
  fixed?: boolean;
}
export interface GEdge {
  a: GNode;
  b: GNode;
  structural: boolean;
}

export const NODE_COLOR: Record<NodeKind, string> = {
  page: "#5aa9ff",
  idea: "#e8b86b",
  link: "#3ddc97",
  project: "#a78bfa",
  hub: "#f3e6cc",
  core: "#ffe2a8",
};

export interface GraphControls {
  zoomBy: (f: number) => void;
  reset: () => void;
  focus: (id: string) => void;
  reheat: () => void;
}

function buildGraph(data: Snapshot, kinds: Set<EntityKind>) {
  const docs = allDocs(data).filter((d) => d.kind !== "conversation" && kinds.has(d.kind as EntityKind));
  const edges = buildEdges(data);
  const deg = new Map<string, number>();
  for (const e of edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  const nodes = new Map<string, GNode>();
  const core: GNode = { id: "__core", kind: "core", title: "Home", x: 0, y: 0, vx: 0, vy: 0, r: 16, degree: 0, fixed: true };
  nodes.set(core.id, core);

  // Hubs: page categories + one hub per other kind.
  const hubKey = (d: Doc) => (d.kind === "page" ? `hub:page:${d.category}` : `hub:${d.kind}`);
  const hubTitle = (d: Doc) => (d.kind === "page" ? d.category : d.kind === "idea" ? "Ideas" : d.kind === "link" ? "Library" : "Portfolio");
  const hubCounts = new Map<string, { title: string; kind: EntityKind; n: number }>();
  for (const d of docs) {
    const k = hubKey(d);
    const h = hubCounts.get(k) ?? { title: hubTitle(d), kind: d.kind as EntityKind, n: 0 };
    h.n++;
    hubCounts.set(k, h);
  }
  const hubs = [...hubCounts.entries()];
  hubs.forEach(([id, h], i) => {
    const ang = (i / hubs.length) * Math.PI * 2 - Math.PI / 2;
    const R = 330;
    nodes.set(id, { id, kind: "hub", hubKind: h.kind, title: h.title, count: h.n, x: Math.cos(ang) * R, y: Math.sin(ang) * R, vx: 0, vy: 0, r: 5, degree: h.n });
  });

  for (const d of docs) {
    const hub = nodes.get(hubKey(d))!;
    const a = Math.random() * Math.PI * 2;
    const dg = deg.get(d.id) ?? 0;
    nodes.set(d.id, {
      id: d.id,
      kind: d.kind as EntityKind,
      title: d.title,
      doc: d,
      x: hub.x * 1.25 + Math.cos(a) * 60,
      y: hub.y * 1.25 + Math.sin(a) * 60,
      vx: 0,
      vy: 0,
      r: 2.2 + Math.min(5, Math.sqrt(dg) * 1.4),
      degree: dg,
    });
  }

  const out: GEdge[] = [];
  for (const [id] of hubs) out.push({ a: core, b: nodes.get(id)!, structural: true });
  for (const d of docs) out.push({ a: nodes.get(hubKey(d))!, b: nodes.get(d.id)!, structural: true });
  for (const e of edges) {
    const a = nodes.get(e.source), b = nodes.get(e.target);
    if (a && b) out.push({ a, b, structural: false });
  }
  return { nodes: [...nodes.values()], edges: out };
}

export function KnowledgeGraph({
  data,
  kinds,
  highlight,
  selectedId,
  onSelect,
  onOpen,
  controls,
  paused,
}: {
  data: Snapshot;
  kinds: Set<EntityKind>;
  highlight: string;
  selectedId: string | null;
  onSelect: (n: GNode | null) => void;
  onOpen: (n: GNode) => void;
  controls: MutableRefObject<GraphControls | null>;
  paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graph = useMemo(() => buildGraph(data, kinds), [data, kinds]);
  const [hover, setHover] = useState<{ node: GNode; x: number; y: number } | null>(null);

  // Mutable render state shared with the animation loop.
  const st = useRef({
    view: { x: 0, y: 0, k: 1 },
    target: null as null | { x: number; y: number; k: number },
    alpha: 1,
    hover: null as GNode | null,
    selected: null as string | null,
    highlight: "",
    paused: false,
    pulses: [] as Array<{ e: GEdge; t: number; speed: number }>,
  });
  st.current.selected = selectedId;
  st.current.highlight = highlight.trim().toLowerCase();
  st.current.paused = paused;

  // Preserve positions across rebuilds (e.g. after edits) for stability.
  const prevPos = useRef(new Map<string, { x: number; y: number }>());
  useEffect(() => {
    for (const n of graph.nodes) {
      const p = prevPos.current.get(n.id);
      if (p) {
        n.x = p.x;
        n.y = p.y;
      }
    }
    st.current.alpha = Math.max(st.current.alpha, prevPos.current.size ? 0.35 : 1);
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { nodes, edges } = graph;
    const s = st.current;
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (s.view.k === 1 && s.view.x === 0) s.view.k = Math.min(1.1, Math.min(W, H) / 820);

    const adj = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!adj.has(e.a.id)) adj.set(e.a.id, new Set());
      if (!adj.has(e.b.id)) adj.set(e.b.id, new Set());
      adj.get(e.a.id)!.add(e.b.id);
      adj.get(e.b.id)!.add(e.a.id);
    }
    const toWorld = (sx: number, sy: number) => ({ x: (sx - W / 2 - s.view.x) / s.view.k, y: (sy - H / 2 - s.view.y) / s.view.k });
    const pick = (sx: number, sy: number) => {
      const w = toWorld(sx, sy);
      let best: GNode | null = null;
      let bd = Infinity;
      for (const n of nodes) {
        const d = Math.hypot(n.x - w.x, n.y - w.y);
        const hit = Math.max(n.r + 4, 10 / s.view.k);
        if (d < hit && d < bd) {
          best = n;
          bd = d;
        }
      }
      return best;
    };

    controls.current = {
      zoomBy: (f) => (s.target = { x: s.view.x * f, y: s.view.y * f, k: Math.min(4, Math.max(0.2, s.view.k * f)) }),
      reset: () => (s.target = { x: 0, y: 0, k: Math.min(1.1, Math.min(W, H) / 820) }),
      focus: (id) => {
        const n = nodes.find((x) => x.id === id);
        if (n) s.target = { k: 1.6, x: -n.x * 1.6, y: -n.y * 1.6 };
      },
      reheat: () => (s.alpha = 1),
    };

    // ── simulation step ────────────────────────────────────────────────
    const step = () => {
      const a = s.alpha;
      if (a < 0.004) return;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          let dx = n.x - m.x, dy = n.y - m.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 1;
          }
          if (d2 > 160000) continue;
          const strength = (n.kind === "hub" || m.kind === "hub" ? 2600 : 900) * a;
          const f = strength / d2;
          const d = Math.sqrt(d2);
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
          m.vx -= (dx / d) * f;
          m.vy -= (dy / d) * f;
        }
      }
      for (const e of edges) {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const rest = e.structural ? (e.a.kind === "core" ? 330 : 80) : 100;
        const k = (e.structural ? (e.a.kind === "core" ? 0.02 : 0.05) : 0.03) * a;
        const f = (d - rest) * k;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        e.a.vx += fx;
        e.a.vy += fy;
        e.b.vx -= fx;
        e.b.vy -= fy;
      }
      for (const n of nodes) {
        if (n.fixed) {
          n.vx = n.vy = 0;
          continue;
        }
        n.vx -= n.x * 0.0015 * a;
        n.vy -= n.y * 0.0015 * a;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += Math.max(-30, Math.min(30, n.vx));
        n.y += Math.max(-30, Math.min(30, n.vy));
      }
      s.alpha *= 0.985;
    };

    // ── render ─────────────────────────────────────────────────────────
    let t = 0;
    const draw = () => {
      const { view } = s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.translate(W / 2 + view.x, H / 2 + view.y);
      ctx.scale(view.k, view.k);

      const focusId = s.hover?.id ?? s.selected;
      const near = focusId ? adj.get(focusId) ?? new Set() : null;
      const hl = s.highlight;
      const isLit = (n: GNode) => (!near && !hl) || n.id === focusId || near?.has(n.id) || (hl && n.title.toLowerCase().includes(hl));

      // Edges
      for (const e of edges) {
        const lit = focusId ? e.a.id === focusId || e.b.id === focusId : false;
        const dim = (near || hl) && !lit;
        ctx.strokeStyle = lit
          ? `${NODE_COLOR[e.a.id === focusId ? e.b.kind : e.a.kind]}cc`
          : e.structural
            ? `rgba(255,240,215,${dim ? 0.025 : e.a.kind === "core" ? 0.12 : 0.07})`
            : `rgba(200,210,255,${dim ? 0.03 : 0.16})`;
        ctx.lineWidth = (lit ? 1.4 : 0.8) / Math.sqrt(view.k);
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.stroke();
      }

      // Light pulses travelling along knowledge edges.
      if (!s.paused) {
        if (s.pulses.length < 14 && Math.random() < 0.08) {
          const pool = edges.filter((e) => !e.structural || e.a.kind === "core");
          const e = pool[Math.floor(Math.random() * pool.length)];
          if (e) s.pulses.push({ e, t: 0, speed: 0.004 + Math.random() * 0.006 });
        }
      }
      s.pulses = s.pulses.filter((p) => p.t <= 1);
      for (const p of s.pulses) {
        if (!s.paused) p.t += p.speed;
        const x = p.e.a.x + (p.e.b.x - p.e.a.x) * p.t;
        const y = p.e.a.y + (p.e.b.y - p.e.a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, "rgba(255,240,210,0.9)");
        g.addColorStop(1, "rgba(255,200,120,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes
      for (const n of nodes) {
        const lit = isLit(n);
        const color = NODE_COLOR[n.kind];
        ctx.globalAlpha = lit ? 1 : 0.16;
        if (n.kind === "core") {
          const pulse = 1 + Math.sin(t * 1.5) * 0.06;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90 * pulse);
          g.addColorStop(0, "rgba(255,226,168,0.55)");
          g.addColorStop(0.25, "rgba(232,184,107,0.22)");
          g.addColorStop(1, "rgba(232,184,107,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, 90 * pulse, 0, Math.PI * 2);
          ctx.fill();
          // Accretion ring
          ctx.save();
          ctx.scale(1, 0.22);
          ctx.strokeStyle = "rgba(255,214,150,0.75)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,240,210,0.95)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          continue;
        }
        if (n.kind === "hub") {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 22);
          g.addColorStop(0, "rgba(255,240,215,0.5)");
          g.addColorStop(1, "rgba(255,240,215,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const sel = n.id === s.selected || n.id === s.hover?.id;
        const r = n.r * (sel ? 1.6 : 1);
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        g.addColorStop(0, `${color}66`);
        g.addColorStop(1, `${color}00`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sel ? "#fff" : color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (sel) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 / view.k;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5 / view.k, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Labels
      ctx.textAlign = "center";
      for (const n of nodes) {
        const lit = isLit(n);
        if (n.kind === "hub") {
          ctx.globalAlpha = lit ? 1 : 0.25;
          ctx.font = `500 ${12 / view.k}px ui-sans-serif, system-ui`;
          ctx.fillStyle = "rgba(240,238,246,0.95)";
          ctx.fillText(n.title, n.x, n.y - 12 / view.k);
          ctx.font = `${10.5 / view.k}px ui-sans-serif, system-ui`;
          ctx.fillStyle = "rgba(160,158,175,0.85)";
          ctx.fillText(`${n.count} ${n.hubKind === "page" ? "pages" : n.hubKind === "idea" ? "ideas" : n.hubKind === "link" ? "links" : "projects"}`, n.x, n.y + 18 / view.k);
        } else if (n.kind === "core") {
          ctx.globalAlpha = 1;
        } else {
          const show = n.id === s.selected || (near && lit && n.id !== s.hover?.id) || (hl && lit) || view.k > 1.7 || (view.k > 1.15 && n.degree >= 3);
          if (!show) continue;
          ctx.globalAlpha = lit ? 0.9 : 0.2;
          ctx.font = `${11 / view.k}px ui-sans-serif, system-ui`;
          ctx.fillStyle = "rgba(220,218,230,0.92)";
          const label = n.title.length > 34 ? `${n.title.slice(0, 32)}…` : n.title;
          ctx.fillText(label, n.x, n.y + n.r + 13 / view.k);
        }
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      t += 0.016;
      if (s.target) {
        s.view.x += (s.target.x - s.view.x) * 0.12;
        s.view.y += (s.target.y - s.view.y) * 0.12;
        s.view.k += (s.target.k - s.view.k) * 0.12;
        if (Math.abs(s.target.k - s.view.k) < 0.001 && Math.abs(s.target.x - s.view.x) < 0.5) s.target = null;
      }
      if (!s.paused) step();
      draw();
    };
    raf = requestAnimationFrame(loop);

    // ── interaction ────────────────────────────────────────────────────
    let drag: null | { node: GNode | null; sx: number; sy: number; vx: number; vy: number; moved: boolean } = null;
    const local = (e: PointerEvent | WheelEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      const node = pick(p.x, p.y);
      drag = { node: node && node.kind !== "core" ? node : null, sx: p.x, sy: p.y, vx: s.view.x, vy: s.view.y, moved: false };
      canvas.setPointerCapture(e.pointerId);
      s.target = null;
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (drag) {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 3) drag.moved = true;
        if (drag.node) {
          const w = toWorld(p.x, p.y);
          drag.node.x = w.x;
          drag.node.y = w.y;
          drag.node.vx = drag.node.vy = 0;
          s.alpha = Math.max(s.alpha, 0.3);
        } else {
          s.view.x = drag.vx + (p.x - drag.sx);
          s.view.y = drag.vy + (p.y - drag.sy);
        }
        return;
      }
      const n = pick(p.x, p.y);
      s.hover = n && n.kind !== "core" ? n : null;
      canvas.style.cursor = n ? "pointer" : "grab";
      setHover(s.hover ? { node: s.hover, x: p.x, y: p.y } : null);
    };
    const onUp = (e: PointerEvent) => {
      const p = local(e);
      if (drag && !drag.moved) {
        const n = pick(p.x, p.y);
        if (!n || n.kind === "core") onSelect(null);
        else if (n.kind === "hub") {
          s.target = { k: 1.5, x: -n.x * 1.5, y: -n.y * 1.5 };
          onSelect(n);
        } else onSelect(n);
      }
      drag = null;
    };
    const onDbl = (e: MouseEvent) => {
      const p = local(e);
      const n = pick(p.x, p.y);
      if (n?.doc) onOpen(n);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const f = Math.exp(-e.deltaY * 0.0015);
      const k = Math.min(4, Math.max(0.2, s.view.k * f));
      const cx = p.x - W / 2, cy = p.y - H / 2;
      s.view.x = cx - ((cx - s.view.x) * k) / s.view.k;
      s.view.y = cy - ((cy - s.view.y) * k) / s.view.k;
      s.view.k = k;
      s.target = null;
    };
    const onLeave = () => {
      s.hover = null;
      setHover(null);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("dblclick", onDbl);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const n of nodes) prevPos.current.set(n.id, { x: n.x, y: n.y });
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("dblclick", onDbl);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [graph, controls, onSelect, onOpen]);

  return (
    <div className="relative size-full">
      <canvas ref={canvasRef} className="size-full touch-none cursor-grab" aria-label={`Knowledge graph with ${graph.nodes.length} nodes and ${graph.edges.length} connections`} role="img" />
      {hover && hover.node.kind !== "hub" && (
        <div className="glass-strong pointer-events-none absolute z-10 max-w-64 rounded-xl px-3 py-2" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em]" style={{ color: NODE_COLOR[hover.node.kind] }}>
            {hover.node.kind} · {hover.node.degree} links
          </p>
          <p className="mt-0.5 text-[13px] text-fg">{hover.node.title}</p>
        </div>
      )}
    </div>
  );
}
