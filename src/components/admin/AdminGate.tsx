"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { watchSession, type Session } from "@/lib/admin-session";
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
