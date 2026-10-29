"use client";

import { useEffect, useState } from "react";
import { watchSession, type Session } from "@/lib/admin-session";
import type { Petition } from "@/lib/types";
import { Dashboard } from "./Dashboard";
import { LoginForm } from "./LoginForm";

export function AdminGate({ petition }: { petition: Petition }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => watchSession(setSession), []);
  if (session === undefined) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  return session ? <Dashboard session={session} petition={petition} /> : <LoginForm />;
}
