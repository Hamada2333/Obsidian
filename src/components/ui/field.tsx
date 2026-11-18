"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm text-fg placeholder:text-fg-faint outline-none transition-all duration-200 hover:border-white/[0.12] focus:border-gold/40 focus:bg-white/[0.045] focus:shadow-[0_0_0_4px_rgba(232,184,107,0.08)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(
  function Input({ className, icon, ...rest }, ref) {
    if (!icon) return <input ref={ref} className={cn(base, "h-10", className)} {...rest} />;
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">{icon}</span>
        <input ref={ref} className={cn(base, "h-10 pl-9", className)} {...rest} />
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { autoGrow?: boolean }>(
  function Textarea({ className, autoGrow, value, ...rest }, ref) {
    const inner = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => inner.current!);
    useEffect(() => {
      if (!autoGrow || !inner.current) return;
      const el = inner.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [value, autoGrow]);
    return <textarea ref={inner} value={value} className={cn(base, "py-2.5 leading-relaxed", autoGrow && "resize-none overflow-hidden", className)} {...rest} />;
  },
);

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(base, "h-10 appearance-none pr-9 [&>option]:bg-ink-900", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle">
        {label}
        {hint && <span className="normal-case tracking-normal text-fg-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Datalist-backed input that suggests existing values while allowing new ones. */
export function ComboInput({ options, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { options: string[]; id: string }) {
  return (
    <>
      <Input list={`${id}-list`} id={id} {...rest} />
      <datalist id={`${id}-list`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
