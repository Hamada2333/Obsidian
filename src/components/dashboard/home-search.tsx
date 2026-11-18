"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useBrain } from "@/lib/store/provider";
import { allDocs } from "@/lib/entities";
import { search } from "@/lib/search";
import { KIND_LABEL, cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/badge";
import { KindIcon } from "@/components/shell/kind-icon";
import { useShell } from "@/components/shell/shell-context";

export function HomeSearch() {
  const { data } = useBrain();
  const { openAsk } = useShell();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [sel, setSel] = useState(-1);
  const docs = useMemo(() => allDocs(data), [data]);
  const hits = useMemo(() => search(docs, q, 6), [docs, q]);
  const box = useRef<HTMLDivElement>(null);
  const open = focus && q.trim().length > 0;

  return (
    <div ref={box} className="relative z-20 mx-auto -mt-9 w-full max-w-3xl px-2">
      <div className={cn("glass-strong flex h-[72px] items-center gap-4 rounded-[26px] px-6 transition-all duration-300", focus && "border-gold/30 shadow-[0_0_0_6px_rgba(232,184,107,0.06),0_30px_80px_-30px_rgba(232,184,107,0.35)]")}>
        <Search className="size-5 text-gold/80" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(-1);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(hits.length, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(-1, s - 1));
            } else if (e.key === "Enter") {
              if (sel >= 0 && sel < hits.length) router.push(hits[sel].doc.href);
              else if (q.trim()) openAsk(q.trim());
            } else if (e.key === "Escape") setQ("");
          }}
          placeholder="Search every page and conversation…"
          aria-label="Search every page and conversation"
          className="h-full flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-faint"
        />
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="glass-strong absolute inset-x-2 top-[80px] rounded-3xl p-2"
          >
            {hits.map((h, i) => (
              <Link
                key={h.doc.id}
                href={h.doc.href}
                onMouseEnter={() => setSel(i)}
                className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", sel === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}
              >
                <KindIcon kind={h.doc.kind} boxed />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-fg">{h.doc.title}</span>
                  <span className="block truncate text-[12.5px] text-fg-subtle">{h.snippet}</span>
                </span>
                <span className="text-[11px] text-fg-faint">{KIND_LABEL[h.doc.kind]}</span>
              </Link>
            ))}
            {hits.length === 0 && <p className="px-3 py-3 text-sm text-fg-subtle">No matches in titles or content.</p>}
            <button
              onMouseEnter={() => setSel(hits.length)}
              onClick={() => openAsk(q.trim())}
              className={cn("mt-1 flex w-full items-center gap-3 rounded-2xl border-t hairline px-3 py-3 text-left", sel === hits.length ? "bg-gold/[0.08]" : "hover:bg-gold/[0.05]")}
            >
              <span className="flex size-8 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                <Sparkles className="size-4 text-gold" />
              </span>
              <span className="text-[14px] text-gold-soft">Ask AI: “{q.trim()}”</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
