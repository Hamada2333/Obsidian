"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ShellApi {
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  askOpen: boolean;
  askSeed: { q: string; n: number } | null;
  openAsk: (question?: string) => void;
  closeAsk: () => void;
  introPlaying: boolean;
  setIntroPlaying: (v: boolean) => void;
  replayIntro: () => void;
  introNonce: number;
}

const Ctx = createContext<ShellApi | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askSeed, setAskSeed] = useState<ShellApi["askSeed"]>(null);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [introNonce, setIntroNonce] = useState(0);
  const openAsk = useCallback((q?: string) => {
    setPaletteOpen(false);
    if (q) setAskSeed({ q, n: Date.now() });
    setAskOpen(true);
  }, []);
  const closeAsk = useCallback(() => setAskOpen(false), []);
  const replayIntro = useCallback(() => setIntroNonce((n) => n + 1), []);
  const value = useMemo(
    () => ({ paletteOpen, setPaletteOpen, askOpen, askSeed, openAsk, closeAsk, introPlaying, setIntroPlaying, replayIntro, introNonce }),
    [paletteOpen, askOpen, askSeed, openAsk, closeAsk, introPlaying, replayIntro, introNonce],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShell outside ShellProvider");
  return c;
}
