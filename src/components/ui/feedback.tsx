"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal } from "./overlay";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// ── Toasts ────────────────────────────────────────────────────────────────
type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface FeedbackApi {
  toast: (t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => void;
  confirm: (opts: { title: string; description?: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const [dialog, setDialog] = useState<null | { title: string; description?: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void }>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback<FeedbackApi["toast"]>(
    (t) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { ...t, tone: t.tone ?? "success", id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 6500 : 4000);
    },
    [dismiss],
  );
  const confirm = useCallback<FeedbackApi["confirm"]>((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  const icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const color = { success: "text-emerald", error: "text-rose", info: "text-blue" };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = icon[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5"
                role="status"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", color[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="text-[13px] font-medium text-gold hover:text-gold-soft"
                  >
                    {t.action.label}
                  </button>
                )}
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-fg-faint hover:text-fg">
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title}
        description={dialog?.description}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={dialog?.danger ? "danger" : "primary"} size="sm" onClick={() => close(true)} data-autofocus>
              {dialog?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFeedback outside FeedbackProvider");
  return c;
}
