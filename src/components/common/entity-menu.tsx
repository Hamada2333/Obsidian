"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

/** Small accessible dropdown menu. */
export function DropMenu({ items, label = "More actions", trigger, align = "right" }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex size-8 items-center justify-center rounded-lg text-fg-subtle transition hover:bg-white/[0.07] hover:text-fg"
      >
        {trigger ?? <MoreHorizontal className="size-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn("glass-strong absolute top-9 z-40 min-w-44 rounded-xl p-1", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]", it.danger ? "text-rose hover:bg-rose/10" : "text-fg-muted hover:bg-white/[0.06] hover:text-fg")}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
