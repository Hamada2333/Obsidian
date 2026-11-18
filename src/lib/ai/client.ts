"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AIRequest } from "./prompts";

export class AIError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

let statusCache: Promise<{ configured: boolean; model: string }> | null = null;

export function getAIStatus() {
  statusCache ??= fetch("/api/ai")
    .then((r) => r.json())
    .catch(() => ({ configured: false, model: "" }));
  return statusCache;
}

export function useAIStatus() {
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  useEffect(() => {
    let alive = true;
    getAIStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

async function fail(res: Response): Promise<never> {
  let msg = `AI request failed (${res.status})`;
  let code: string | undefined;
  try {
    const j = await res.json();
    msg = j.error ?? msg;
    code = j.code;
  } catch {}
  throw new AIError(msg, code);
}

export async function aiJSON<T>(req: AIRequest, signal?: AbortSignal): Promise<T> {
  const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal });
  if (!res.ok) await fail(res);
  return (await res.json()).result as T;
}

export async function aiStream(req: AIRequest, onText: (full: string) => void, signal?: AbortSignal) {
  const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal });
  if (!res.ok || !res.body) await fail(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

/** Streaming text task with loading / error / cancel state. */
export function useAIStream() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (req: AIRequest) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    setText("");
    try {
      return await aiStream(req, setText, c.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(e instanceof AIError ? e : new AIError("Network error"));
      return null;
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
    setLoading(false);
  }, []);
  const reset = useCallback(() => {
    ctrl.current?.abort();
    setText("");
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => () => ctrl.current?.abort(), []);
  return { text, loading, error, run, cancel, reset };
}
