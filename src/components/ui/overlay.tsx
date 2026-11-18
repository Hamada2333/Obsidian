"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current;
      target?.focus();
    }, 30);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useOverlay(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={cn("glass-strong relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl outline-none sm:max-w-lg sm:rounded-3xl", className)}
            >
              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
                  <div>
                    {title && <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>}
                    {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
                  </div>
                  <IconButton label="Close" onClick={onClose} size="sm">
                    <X className="size-4" />
                  </IconButton>
                </div>
              )}
              <div className="px-6 py-4">{children}</div>
              {footer && <div className="flex items-center justify-end gap-2 border-t hairline px-6 py-4">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Drawer({ open, onClose, children, className, width = "max-w-xl" }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; width?: string }) {
  const ref = useOverlay(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.aside
              ref={ref}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={cn("glass-strong absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden rounded-l-3xl border-r-0 outline-none", width, className)}
            >
              {children}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
