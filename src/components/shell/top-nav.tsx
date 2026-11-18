"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Archive, Cloud, HardDrive, LogOut, Menu, Search, Settings, Sparkles, X } from "lucide-react";
import { useAuth, useBrain } from "@/lib/store/provider";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/badge";
import { useShell } from "./shell-context";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/pages", label: "Pages" },
  { href: "/ideas", label: "Ideas" },
  { href: "/links", label: "Links" },
  { href: "/projects", label: "Projects" },
  { href: "/graph", label: "Graph" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-7 items-center justify-center", className)} aria-hidden>
      <span className="absolute inset-0 rounded-full bg-gold/25 blur-md" />
      <svg viewBox="0 0 32 32" className="relative size-7">
        <defs>
          <radialGradient id="bm" cx="50%" cy="50%" r="50%">
            <stop offset="0.55" stopColor="#000" />
            <stop offset="0.62" stopColor="#fff3d6" />
            <stop offset="0.8" stopColor="#e8b86b" stopOpacity="0.6" />
            <stop offset="1" stopColor="#e8b86b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="15" ry="3.2" fill="#e8b86b" opacity="0.55" />
        <circle cx="16" cy="16" r="9" fill="url(#bm)" />
        <path d="M1.5 16.6 C 8 19.4, 24 19.4, 30.5 16.6" stroke="#fff1d0" strokeWidth="1.1" fill="none" opacity="0.9" />
      </svg>
    </span>
  );
}

function SaveDot() {
  const { state } = useBrain();
  const tone = state.saveState === "error" ? "bg-rose" : state.saveState === "saving" ? "bg-gold animate-pulse-soft" : "bg-emerald";
  const label =
    state.saveState === "error" ? `Not saved: ${state.saveError}` : state.saveState === "saving" ? "Saving…" : `All changes saved (${state.backend === "local" ? "this browser" : "cloud"})`;
  return (
    <span title={label} className="relative flex size-2" aria-label={label}>
      <span className={cn("absolute inset-0 rounded-full", tone)} />
    </span>
  );
}

function ProfileMenu() {
  const { data, state } = useBrain();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const name = data.profile.name || "You";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative flex size-9 items-center justify-center rounded-full p-[1.5px] transition-transform active:scale-95"
        style={{ background: "conic-gradient(from 210deg, #e8b86b, #a78bfa, #5aa9ff, #3ddc97, #e8b86b)" }}
      >
        <span className="flex size-full items-center justify-center rounded-full bg-ink-900 text-[12px] font-semibold tracking-wide text-fg">{initials}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl p-2"
          >
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <span className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-sm font-semibold text-gold-soft">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{name}</p>
                <p className="truncate text-xs text-fg-subtle">{auth.session?.user.email ?? data.profile.role ?? "Local workspace"}</p>
              </div>
            </div>
            <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[12px] text-fg-muted">
              {state.backend === "local" ? <HardDrive className="size-3.5 text-gold" /> : <Cloud className="size-3.5 text-emerald" />}
              {state.backend === "local" ? "Stored in this browser" : "Synced to Supabase"}
            </div>
            <div className="h-px bg-white/[0.06]" />
            <Link role="menuitem" onClick={() => setOpen(false)} href="/settings" className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/[0.05] hover:text-fg">
              <Settings className="size-4" /> Settings
            </Link>
            <Link role="menuitem" onClick={() => setOpen(false)} href="/archive" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/[0.05] hover:text-fg">
              <Archive className="size-4" /> Archive
            </Link>
            {auth.mode === "supabase" && (
              <button role="menuitem" onClick={() => auth.signOut()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/[0.05] hover:text-rose">
                <LogOut className="size-4" /> Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { setPaletteOpen, openAsk } = useShell();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[linear-gradient(180deg,rgba(3,3,5,0.92)_0%,rgba(3,3,5,0.7)_65%,transparent)] px-4 pb-2 pt-4 md:px-6">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-full pr-2" aria-label="Second Brain home">
            <BrandMark />
            <span className="hidden text-[13px] font-medium tracking-[0.18em] text-fg/90 xl:inline">SECOND BRAIN</span>
          </Link>

          <nav className="glass mx-auto hidden h-11 items-center rounded-full px-1.5 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-200", active ? "text-fg" : "text-fg-subtle hover:text-fg-muted")}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full border border-white/[0.09] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              onClick={() => setPaletteOpen(true)}
              className="glass hidden h-10 items-center gap-2.5 rounded-full pl-3.5 pr-2 text-[13px] text-fg-subtle transition hover:text-fg-muted md:flex"
            >
              <Search className="size-4" />
              <span className="w-28 text-left xl:w-40">Search…</span>
              <Kbd>{mac ? "⌘" : "Ctrl"} K</Kbd>
            </button>
            <button onClick={() => setPaletteOpen(true)} aria-label="Search" className="glass flex size-10 items-center justify-center rounded-full text-fg-muted md:hidden">
              <Search className="size-4" />
            </button>
            <button
              onClick={() => openAsk()}
              className="group relative flex h-10 items-center gap-2 overflow-hidden rounded-full border border-gold/25 bg-gold/[0.08] px-3.5 text-[13px] font-medium text-gold-soft transition hover:border-gold/40 hover:bg-gold/[0.14]"
              title={`Ask your Second Brain (${mac ? "⌘" : "Ctrl"} J)`}
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
            <div className="hidden px-1 sm:block">
              <SaveDot />
            </div>
            <ProfileMenu />
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="glass flex size-10 items-center justify-center rounded-full text-fg-muted lg:hidden">
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
            <motion.nav
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-strong absolute inset-x-4 top-4 rounded-3xl p-3"
              aria-label="Mobile"
            >
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="flex items-center gap-2 text-[13px] tracking-[0.18em]">
                  <BrandMark /> SECOND BRAIN
                </span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-white/5">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-2xl border px-4 py-3.5 text-[15px] transition",
                      isActive(pathname, item.href) ? "border-gold/30 bg-gold/10 text-gold-soft" : "border-white/[0.06] bg-white/[0.02] text-fg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
