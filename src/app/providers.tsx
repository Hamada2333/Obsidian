"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { BrainProvider } from "@/lib/store/provider";
import { FeedbackProvider } from "@/components/ui/feedback";
import { ShellProvider } from "@/components/shell/shell-context";
import { AppShell } from "@/components/shell/app-shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <BrainProvider>
        <FeedbackProvider>
          <ShellProvider>
            <AppShell>{children}</AppShell>
          </ShellProvider>
        </FeedbackProvider>
      </BrainProvider>
    </MotionConfig>
  );
}
