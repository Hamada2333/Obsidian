import { FileText, Lightbulb, Link2, MessagesSquare, Orbit } from "lucide-react";
import type { EntityKind } from "@/lib/types";
import { ACCENT_HEX, KIND_ACCENT, cn } from "@/lib/utils";

const ICON = { page: FileText, idea: Lightbulb, link: Link2, project: Orbit, conversation: MessagesSquare };

export function KindIcon({ kind, className, boxed }: { kind: EntityKind | "conversation"; className?: string; boxed?: boolean }) {
  const Icon = ICON[kind];
  const color = ACCENT_HEX[KIND_ACCENT[kind]];
  if (!boxed) return <Icon className={cn("size-4", className)} style={{ color }} />;
  return (
    <span
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-xl border", className)}
      style={{ color, borderColor: `${color}33`, background: `${color}12` }}
    >
      <Icon className="size-[15px]" />
    </span>
  );
}
