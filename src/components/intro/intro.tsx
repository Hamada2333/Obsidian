"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { BlackHole, DEFAULT_PARAMS, type BlackHoleParams } from "@/components/cosmos/black-hole";
import { OrbitRings } from "@/components/cosmos/orbit-rings";

export const INTRO_SEEN_KEY = "second-brain:intro-seen";

export function hasSeenIntro() {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
export function setIntroSeen(seen: boolean) {
  try {
    if (seen) window.localStorage.setItem(INTRO_SEEN_KEY, "1");
    else window.localStorage.removeItem(INTRO_SEEN_KEY);
  } catch {}
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t: number) => t * t * t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const TITLE = "SECOND BRAIN";
const HOLD_END = 6.2; // seconds before the dive begins
const DIVE = 1.6;

/**
 * Cinematic intro: slow approach toward the black hole, title reveal,
 * then a dive through the event horizon that dissolves into the app.
 * The whole camera path is driven from one rAF timeline that writes
 * shader uniforms directly, so React never re-renders per frame.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const params = useRef<BlackHoleParams>({ ...DEFAULT_PARAMS, zoom: 0.32, exposure: 0, tilt: -0.12 });
  const [phase, setPhase] = useState<"approach" | "title" | "dive" | "done">("approach");
  const [ready, setReady] = useState(false);
  const diveStart = useRef<number | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const titled = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setIntroSeen(true);
    setPhase("done");
    setTimeout(onDone, 650);
  }, [onDone]);

  const dive = useCallback(() => {
    if (diveStart.current === null) {
      diveStart.current = performance.now();
      setPhase("dive");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const t = (now - start) / 1000;
      const p = params.current;
      // Approach: exposure fades up, camera pushes in and levels out.
      const a = ease(clamp01(t / 5.5));
      p.exposure = Math.min(1, t / 1.6);
      p.zoom = 0.32 + a * 0.78;
      p.tilt = -0.12 * (1 - a);
      p.spin = 1 + (1 - a) * 0.6;
      if (t > 1.3 && !titled.current && diveStart.current === null) {
        titled.current = true;
        setPhase("title");
      }
      if (t > HOLD_END) dive();
      if (diveStart.current !== null) {
        const d = clamp01((now - diveStart.current) / 1000 / DIVE);
        const e = easeIn(d);
        p.zoom = 1.1 + e * 26;
        p.spin = 1 + e * 6;
        p.exposure = 1 + e * 0.6;
        if (flashRef.current) flashRef.current.style.opacity = String(Math.max(0, (d - 0.55) / 0.45));
        if (d >= 1) {
          cancelAnimationFrame(raf);
          finish();
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, dive, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter" || e.key === " ") dive();
    };
    window.addEventListener("keydown", onKey);
    // Safety net if WebGL never reports ready.
    const fallback = setTimeout(() => setReady(true), 2500);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(fallback);
    };
  }, [dive, finish]);

  const showTitle = phase === "title";

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[200] cursor-default select-none bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }}
          onClick={dive}
        >
          <BlackHole className="absolute inset-0" params={params} quality={0.9} onReady={() => setReady(true)} />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: phase === "dive" ? 0 : 0.85, scale: phase === "dive" ? 2.4 : 1 }}
            transition={{ duration: phase === "dive" ? 1.4 : 5, ease: [0.16, 1, 0.3, 1] }}
          >
            <OrbitRings className="h-[150vmin] w-[150vmin] opacity-70" count={4} />
          </motion.div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

          {/* Title */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[16vh] flex flex-col items-center px-6 text-center">
            <AnimatePresence>
              {showTitle && (
                <motion.div key="title" exit={{ opacity: 0, filter: "blur(12px)", y: -10, transition: { duration: 0.6 } }}>
                  <h1 className="flex justify-center font-sans text-[clamp(22px,4.4vw,64px)] font-light tracking-[0.34em] text-gradient-gold glow-gold [text-indent:0.34em]">
                    {TITLE.split("").map((ch, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: 0.06 * i, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-block"
                      >
                        {ch === " " ? " " : ch}
                      </motion.span>
                    ))}
                  </h1>
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 1.1, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto mt-6 h-px w-48 bg-gradient-to-r from-transparent via-gold/70 to-transparent"
                  />
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 1.2 }}
                    className="mt-5 font-display text-lg italic text-fg-muted md:text-xl"
                  >
                    Everything you know, in orbit.
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "dive" ? 0 : 1 }}
            transition={{ delay: phase === "dive" ? 0 : 0.8, duration: 0.8 }}
            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3 md:left-auto md:right-8 md:translate-x-0"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                dive();
              }}
              className="rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-[13px] font-medium tracking-wide text-gold-soft backdrop-blur-md transition hover:bg-gold/20"
            >
              Enter
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-fg-muted backdrop-blur-md transition hover:text-fg"
            >
              Skip intro
            </button>
          </motion.div>
          <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#fff8ea,#e8b86b_30%,#05050a_75%)] opacity-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
