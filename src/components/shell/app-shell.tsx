"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth, useBrainState, useBrainStore } from "@/lib/store/provider";
import { CosmicBackdrop } from "@/components/cosmos/starfield";
import { Intro, hasSeenIntro } from "@/components/intro/intro";
import { Button } from "@/components/ui/button";
import { TopNav, BrandMark } from "./top-nav";
import { CommandPalette } from "./command-palette";
import { AskPanel } from "./ask-panel";
import { useShell } from "./shell-context";

function LoadingScreen({ label = "Waking your second brain" }: { label?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
        <BrandMark className="size-12 scale-150" />
      </motion.div>
      <p className="text-[12px] uppercase tracking-[0.3em] text-fg-subtle">{label}</p>
    </div>
  );
}

function useGlobalShortcuts() {
  const { setPaletteOpen, paletteOpen, openAsk } = useShell();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      } else if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        openAsk();
      } else if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen, paletteOpen, openAsk]);
}

function ReadyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const state = useBrainState()!;
  const { introNonce } = useShell();
  const [intro, setIntro] = useState(false);
  useGlobalShortcuts();

  useEffect(() => {
    const prefs = state.data.preferences;
    const reduce = prefs.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (introNonce > 0) setIntro(true);
    else if (!reduce && prefs.showIntro && !hasSeenIntro()) setIntro(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introNonce]);

  return (
    <>
      <CosmicBackdrop still={state.data.preferences.reducedMotion} />
      <div className="grain relative z-[2] flex min-h-dvh flex-col">
        <TopNav />
        {/* Enter-only route transition: exit animations with App Router children cause double mounts. */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-8 md:px-8 md:pt-12"
        >
          {children}
        </motion.main>
      </div>
      <CommandPalette />
      <AskPanel />
      {intro && <Intro onDone={() => setIntro(false)} />}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const store = useBrainStore();
  const state = useBrainState();

  const isLogin = pathname === "/login";
  useEffect(() => {
    if (auth.mode === "supabase" && auth.status === "signed-out" && !isLogin) router.replace("/login");
    if (auth.mode === "supabase" && auth.status === "signed-in" && isLogin) router.replace("/");
  }, [auth.mode, auth.status, isLogin, router]);

  if (isLogin) {
    return (
      <>
        <CosmicBackdrop />
        <div className="relative z-[2]">{children}</div>
      </>
    );
  }
  if (auth.status !== "signed-in" || !state || state.status === "loading") {
    return (
      <>
        <CosmicBackdrop still />
        <LoadingScreen />
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <CosmicBackdrop still />
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="glass max-w-md rounded-3xl p-8 text-center">
            <AlertTriangle className="mx-auto size-6 text-rose" />
            <p className="mt-4 text-lg font-medium">Couldn&apos;t load your workspace</p>
            <p className="mt-2 text-sm text-fg-muted">{state.error}</p>
            <Button className="mt-6" variant="primary" onClick={() => void store?.init()}>
              Try again
            </Button>
          </div>
        </div>
      </>
    );
  }
  return <ReadyShell>{children}</ReadyShell>;
}
