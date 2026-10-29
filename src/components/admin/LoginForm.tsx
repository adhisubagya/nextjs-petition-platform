"use client";

import { useState } from "react";
import { signIn } from "@/lib/admin-session";
import { DEMO_ADMIN, DEMO_MODE } from "@/lib/demo";

const input = "w-full rounded border border-border px-3 py-2";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signIn(String(form.get("email")), String(form.get("password")));
    } catch {
      setError("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 py-16">
      <h1 className="text-2xl font-bold">Admin login</h1>
      {DEMO_MODE && (
        <div className="rounded border border-border bg-muted p-3 text-sm">
          <p className="font-medium">View-only demo account</p>
          <p>Email: <code>{DEMO_ADMIN.email}</code></p>
          <p>Password: <code>{DEMO_ADMIN.password}</code></p>
        </div>
      )}
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
