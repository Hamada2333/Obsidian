"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrainStore, type StoreState } from "./brain-store";
import { LocalAdapter } from "./local-adapter";
import { SupabaseAdapter } from "./supabase-adapter";
import { getSupabase, isSupabaseConfigured } from "../supabase";

interface AuthState {
  mode: "local" | "supabase";
  status: "loading" | "signed-in" | "signed-out";
  session: Session | null;
  signOut: () => Promise<void>;
}

const StoreCtx = createContext<BrainStore | null>(null);
const AuthCtx = createContext<AuthState | null>(null);

export function BrainProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthState["status"]>(isSupabaseConfigured ? "loading" : "signed-in");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthStatus(data.session ? "signed-in" : "signed-out");
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthStatus(s ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const store = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      return sb && userId ? new BrainStore(new SupabaseAdapter(sb, userId)) : null;
    }
    return new BrainStore(new LocalAdapter());
  }, [userId]);

  useEffect(() => {
    if (!store) return;
    void store.init();
    const flush = () => void store.flush();
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      void store.flush();
    };
  }, [store]);

  const auth = useMemo<AuthState>(
    () => ({
      mode: isSupabaseConfigured ? "supabase" : "local",
      status: authStatus,
      session,
      signOut: async () => {
        await store?.flush();
        await getSupabase()?.auth.signOut();
      },
    }),
    [authStatus, session, store],
  );

  return (
    <AuthCtx.Provider value={auth}>
      <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const a = useContext(AuthCtx);
  if (!a) throw new Error("useAuth outside BrainProvider");
  return a;
}

/** The store instance (stable). Null until auth resolves in Supabase mode. */
export function useBrainStore() {
  return useContext(StoreCtx);
}

const noopSub = () => () => {};
const LOADING: StoreState | null = null;

export function useBrainState(): StoreState | null {
  const store = useContext(StoreCtx);
  return useSyncExternalStore(
    store ? store.subscribe : noopSub,
    store ? store.getState : () => LOADING,
    () => LOADING,
  );
}

/** For components rendered inside the ready app shell. */
export function useBrain() {
  const store = useContext(StoreCtx);
  const state = useBrainState();
  if (!store || !state) throw new Error("useBrain used before the workspace is ready");
  return { data: state.data, state, actions: store };
}

/** Wrap route components so their hooks only run once the workspace is loaded. */
export function withBrain<P extends object>(Component: React.ComponentType<P>) {
  function Gate(props: P) {
    const state = useBrainState();
    if (!state || state.status !== "ready") return null;
    return <Component {...props} />;
  }
  Gate.displayName = `withBrain(${Component.displayName ?? Component.name})`;
  return Gate;
}
