"use client";

import { useRef, useState, type ReactNode } from "react";
import { Cloud, Database, Download, HardDrive, KeyRound, Play, RefreshCcw, Sparkles, Trash2, Upload, User } from "lucide-react";
import { useAuth, useBrain, withBrain } from "@/lib/store/provider";
import { useAIStatus } from "@/lib/ai/client";
import { migrate } from "@/lib/store/brain-store";
import { isoDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Snapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge, Kbd } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/surface";
import { useFeedback } from "@/components/ui/feedback";
import { useShell } from "@/components/shell/shell-context";
import { setIntroSeen } from "@/components/intro/intro";

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="glass grid gap-6 rounded-3xl p-6 md:grid-cols-[260px_minmax(0,1fr)] md:p-8">
      <div>
        <div className="flex items-center gap-2.5 text-fg">
          <span className="flex size-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gold">{icon}</span>
          <h2 className="text-[15px] font-medium">{title}</h2>
        </div>
        {description && <p className="mt-2 text-[13px] leading-relaxed text-fg-subtle">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6">
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-[12.5px] text-fg-subtle">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors", checked ? "border-gold/40 bg-gold/70" : "border-white/10 bg-white/[0.06]")}
      >
        <span className={cn("absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

const SHORTCUTS: Array<[string[], string]> = [
  [["⌘", "K"], "Search & command palette"],
  [["/"], "Quick search"],
  [["⌘", "J"], "Ask your Second Brain"],
  [["⌘", "B"], "Bold (editor)"],
  [["⌘", "I"], "Italic (editor)"],
  [["[", "["], "Link to a page (editor)"],
  [["⌘", "↵"], "Capture idea & open it"],
  [["Esc"], "Close dialogs, skip intro"],
];

function SettingsView() {
  const { data, state, actions } = useBrain();
  const auth = useAuth();
  const ai = useAIStatus();
  const { replayIntro } = useShell();
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const p = data.profile;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `second-brain-${isoDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Export ready", description: a.download });
  };

  const importData = async (file: File) => {
    setImporting(true);
    try {
      const snap = migrate(JSON.parse(await file.text()) as Snapshot);
      const n = snap.pages.length + snap.ideas.length + snap.links.length + snap.projects.length;
      if (await confirm({ title: `Replace your workspace with ${n} items from “${file.name}”?`, description: "Your current data will be overwritten. Export first if unsure.", confirmLabel: "Import", danger: true })) {
        actions.replaceAll(snap);
        toast({ title: "Workspace imported", description: `${n} items` });
      }
    } catch {
      toast({ tone: "error", title: "Import failed", description: "That file isn't a valid Second Brain export." });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Preferences" title="Settings" description="Your profile, the cinematic experience, AI and where your knowledge lives." />
      <div className="space-y-5">
        <Section icon={<User className="size-4" />} title="Profile" description="Used for your greeting and across the app.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={p.name} onChange={(e) => actions.updateProfile({ name: e.target.value })} placeholder="Your name" />
            </Field>
            <Field label="Role">
              <Input value={p.role} onChange={(e) => actions.updateProfile({ role: e.target.value })} placeholder="Founder, designer…" />
            </Field>
          </div>
          {auth.session?.user.email && <p className="text-[13px] text-fg-subtle">Signed in as {auth.session.user.email}</p>}
        </Section>

        <Section icon={<Play className="size-4" />} title="Experience" description="Motion, the intro, and ambient effects.">
          <Toggle
            checked={data.preferences.showIntro}
            onChange={(v) => {
              actions.updatePreferences({ showIntro: v });
              if (v) setIntroSeen(false);
            }}
            label="Cinematic intro"
            hint="Plays once, then remembered. Turning it on resets it for your next visit."
          />
          <Toggle checked={data.preferences.reducedMotion} onChange={(v) => actions.updatePreferences({ reducedMotion: v })} label="Reduce motion" hint="Freezes the starfield, black hole and graph animation." />
          <Button size="sm" icon={<Play className="size-3.5" />} onClick={replayIntro}>
            Replay intro now
          </Button>
        </Section>

        <Section icon={<Sparkles className="size-4" />} title="AI" description="Summaries, idea expansion, categorisation, conversation digests and Ask.">
          <div className="flex items-center gap-3">
            {ai === null ? <Badge>Checking…</Badge> : ai.configured ? <Badge accent="emerald" dot>Connected</Badge> : <Badge accent="gold" dot>Not configured</Badge>}
            {ai?.model && <span className="font-mono text-[12px] text-fg-subtle">{ai.model}</span>}
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-4 font-mono text-[12.5px] leading-relaxed text-fg-muted">
            <p className="text-fg-faint"># .env.local (server only — never exposed to the browser)</p>
            <p>
              ANTHROPIC_API_KEY=<span className="text-gold">sk-ant-…</span>
            </p>
            <p className="text-fg-faint"># optional</p>
            <p>ANTHROPIC_MODEL=claude-opus-5-5</p>
          </div>
          <p className="flex items-start gap-2 text-[12.5px] text-fg-subtle">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            Requests go through <code className="font-mono">/api/ai</code>. Search, related-content suggestions and analytics run locally and work without a key.
          </p>
        </Section>

        <Section icon={<Database className="size-4" />} title="Data & storage" description="Your knowledge, portable and yours.">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            {state.backend === "local" ? <HardDrive className="size-5 text-gold" /> : <Cloud className="size-5 text-emerald" />}
            <div className="flex-1">
              <p className="text-sm text-fg">{state.backend === "local" ? "Local mode — stored in this browser" : "Cloud mode — synced to Supabase"}</p>
              <p className="text-[12.5px] text-fg-subtle">
                {state.backend === "local" ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and sync." : "Row-level security keeps every row private to your account."}
              </p>
            </div>
            <Badge accent={state.saveState === "error" ? "rose" : "emerald"} dot>
              {state.saveState === "error" ? "Save error" : state.saveState === "saving" ? "Saving" : "Saved"}
            </Badge>
          </div>
          {state.saveError && <p className="text-[13px] text-rose">{state.saveError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportData}>
              Export JSON
            </Button>
            <Button size="sm" icon={<Upload className="size-3.5" />} loading={importing} onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCcw className="size-3.5" />}
              onClick={async () => {
                if (await confirm({ title: "Reset to demo workspace?", description: "Replaces all content with the sample workspace.", confirmLabel: "Reset", danger: true })) {
                  actions.resetToDemo();
                  toast({ title: "Demo workspace restored" });
                }
              }}
            >
              Load demo data
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="size-3.5" />}
              onClick={async () => {
                if (await confirm({ title: "Delete everything?", description: "All pages, ideas, links, projects and conversations will be removed. This cannot be undone.", confirmLabel: "Delete all", danger: true })) {
                  actions.clearAll();
                  toast({ title: "Workspace cleared" });
                }
              }}
            >
              Start empty
            </Button>
          </div>
        </Section>

        <Section icon={<Kbd className="border-0 bg-transparent text-gold">⌘</Kbd>} title="Keyboard" description="Everything is two keystrokes away.">
          <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {SHORTCUTS.map(([keys, label]) => (
              <li key={label} className="flex items-center justify-between gap-4 text-[13px] text-fg-muted">
                {label}
                <span className="flex gap-1">
                  {keys.map((k, i) => (
                    <Kbd key={i}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

export default withBrain(SettingsView);
