"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut, Pin, PinOff, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { signOut, type Session } from "@/lib/admin-session";
import { DEMO_DISABLED_MESSAGE, DEMO_MODE } from "@/lib/demo";
import type { CommentPage } from "@/lib/petition";
import type { Stats } from "@/lib/server/posthog";
import type { Petition } from "@/lib/types";

export function Dashboard({ session, petition }: { session: Session; petition: Petition }) {
  const qc = useQueryClient();
  const [goal, setGoal] = useState(petition.goal);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await session.token();
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Request failed");
    return res.json();
  }

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => api<Stats>("/api/admin/stats") });
  const comments = useQuery({ queryKey: ["admin-comments"], queryFn: () => api<CommentPage>("/api/comments") });

  // Demo Mode: controls look live but never call the API.
  async function guarded(action: () => Promise<unknown>, success: string) {
    if (DEMO_MODE) return void toast(DEMO_DISABLED_MESSAGE);
    try {
      await action();
      toast.success(success);
      await qc.invalidateQueries({ queryKey: ["admin-comments"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {session.email}
            {DEMO_MODE && " · view-only demo"}
          </p>
        </div>
        <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-sm">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </header>

      <section aria-label="Traffic, last 7 days" className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<BarChart3 className="size-4" />} label="Page views (7d)" value={stats.data?.pageviews} />
        <Stat icon={<Users className="size-4" />} label="Visitors (7d)" value={stats.data?.visitors} />
        <Stat icon={<Users className="size-4" />} label="Signatures" value={petition.signatureCount} />
        <div className="rounded-lg border border-border p-4 sm:col-span-3">
          <h2 className="text-sm font-medium">Top sources{stats.data?.sample && " (sample data)"}</h2>
          {stats.isError && <p className="text-sm text-destructive">Could not load analytics.</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {stats.data?.referrers.map((r) => (
              <li key={r.source} className="flex justify-between">
                <span>{r.source}</span>
                <span className="tabular-nums">{r.count.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Settings</h2>
        <label htmlFor="goal" className="block text-sm font-medium">Max signatures</label>
        <div className="flex gap-2">
          <input
            id="goal"
            type="number"
            min={1}
            value={goal}
            onChange={(e) => (DEMO_MODE ? toast(DEMO_DISABLED_MESSAGE) : setGoal(Number(e.target.value)))}
            className="w-40 rounded border border-border px-3 py-2"
          />
          <button
            type="button"
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => guarded(() => api("/api/admin/petition", { method: "PATCH", body: JSON.stringify({ goal }) }), "Goal updated")}
          >
            Save
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Comments</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {comments.data?.comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{c.name}</span>
                <p className="break-words text-muted-foreground">{c.message}</p>
              </div>
              <button
                type="button"
                aria-label={c.pinned ? `Unpin comment by ${c.name}` : `Pin comment by ${c.name}`}
                className="shrink-0 rounded border border-border p-1.5"
                onClick={() =>
                  guarded(
                    () => api(`/api/admin/comments/${c.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !c.pinned }) }),
                    c.pinned ? "Unpinned" : "Pinned",
                  )
                }
              >
                {c.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value === undefined ? "…" : value.toLocaleString("en-US")}</p>
    </div>
  );
}
