"use client";

import { useEffect, useRef } from "react";

/** Lightweight 2D-canvas starfield with depth parallax and slow drift. */
export function Starfield({ density = 0.00018, still = false }: { density?: number; still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, dpr = 1;
    type Star = { x: number; y: number; z: number; r: number; tw: number; hue: number };
    let stars: Star[] = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(w * h * density);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() ** 2,
        r: Math.random() ** 3 * 1.3 + 0.25,
        tw: Math.random() * Math.PI * 2,
        hue: Math.random(),
      }));
    };
    resize();
    window.addEventListener("resize", resize);
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      m.tx = e.clientX / w - 0.5;
      m.ty = e.clientY / h - 0.5;
    };
    window.addEventListener("pointermove", onMove);
    let raf = 0;
    let t = 0;
    let last = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (still && t > 0) return;
      t += dt;
      m.x += (m.tx - m.x) * 0.03;
      m.y += (m.ty - m.y) * 0.03;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const depth = 0.25 + s.z * 0.75;
        s.x -= dt * 2.2 * depth;
        if (s.x < -4) s.x = w + 4;
        const px = s.x - m.x * 18 * depth;
        const py = s.y - m.y * 18 * depth;
        const a = (0.25 + 0.75 * depth) * (0.65 + 0.35 * Math.sin(t * (0.6 + s.hue) + s.tw));
        ctx.fillStyle = s.hue > 0.82 ? `rgba(255,214,160,${a})` : s.hue < 0.12 ? `rgba(170,200,255,${a})` : `rgba(235,235,245,${a})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * depth + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [density, still]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 size-full" aria-hidden />;
}

/** Fixed ambient backdrop shared by every screen. */
export function CosmicBackdrop({ still }: { still?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(232,184,107,0.10),transparent_60%),radial-gradient(ellipse_60%_50%_at_100%_30%,rgba(167,139,250,0.06),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_80%,rgba(90,169,255,0.05),transparent_60%),linear-gradient(180deg,#05050a,#030305)]" />
      <Starfield still={still} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_70%_60%_at_50%_120%,rgba(61,220,151,0.04),transparent_70%)]" />
    </div>
  );
}
