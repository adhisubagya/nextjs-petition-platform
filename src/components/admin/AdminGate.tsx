"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi } from "@/lib/admin-api";
import { watchSession, type Session } from "@/lib/admin-session";
import { blocked, DEFAULT_SETTINGS, type Capability, type Settings } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

const SessionContext = createContext<Session | null>(null);

/** Admin pages render their content only for a signed-in session; children read it with `useAdminSession`. */
export function AdminGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => watchSession(setSession), []);
  if (session === undefined) return <p className="flex min-h-[80vh] items-center justify-center text-sm text-muted-foreground">Loading…</p>;
  return session ? <SessionContext.Provider value={session}>{children}</SessionContext.Provider> : <LoginForm />;
}

export function useAdminSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useAdminSession must be used inside AdminGate");
  return session;
}

/** Developer settings for hiding controls; the server enforces them regardless. Defaults while loading. */
export function useAdminSettings() {
  const session = useAdminSession();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi<{ settings: Settings; developer: boolean }>(session, "/api/admin/settings"),
  });
  const settings = data?.settings ?? DEFAULT_SETTINGS;
  const developer = data?.developer ?? false;
  return { settings, developer, can: (cap: Capability) => blocked(settings, cap, developer) === null };
}
