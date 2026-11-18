"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, subtitle, action, children, className, bodyClassName, delay = 0 }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("glass relative flex flex-col overflow-hidden rounded-3xl", className)}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h3 className="text-[13px] font-medium tracking-[-0.005em] text-fg">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[12px] text-fg-subtle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
    </motion.section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
    >
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-gold/80">{eyebrow}</p>}
        <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-fg md:text-[52px]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.08] px-6 py-16 text-center", className)}>
      {icon && (
        <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-gold">
          <div className="absolute inset-0 rounded-2xl bg-gold/10 blur-xl" />
          <span className="relative">{icon}</span>
        </div>
      )}
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; title?: string }>; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl border border-white/[0.07] bg-white/[0.025] p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] transition-colors",
            value === o.value ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-[10px] border border-white/[0.08] bg-white/[0.07]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
          )}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}
