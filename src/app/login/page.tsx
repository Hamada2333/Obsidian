"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { BrandMark } from "@/components/shell/top-nav";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong w-full max-w-sm rounded-3xl p-8"
      >
        <BrandMark className="scale-125" />
        <h1 className="mt-6 font-display text-4xl text-fg">Welcome back</h1>
        <p className="mt-2 text-sm text-fg-muted">Sign in to your Second Brain with a magic link.</p>
        {!isSupabaseConfigured ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-fg-muted">
            Supabase isn&apos;t configured, so the app runs in local mode and doesn&apos;t need sign-in.
          </p>
        ) : state === "sent" ? (
          <p className="mt-6 rounded-xl border border-emerald/20 bg-emerald/[0.06] p-4 text-sm text-emerald">Check {email} for your sign-in link.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" icon={<Mail className="size-4" />} />
            {state === "error" && <p className="text-sm text-rose">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" loading={state === "sending"}>
              Send magic link
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
