"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, PenLine, Pin, PinOff, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { Session } from "@/lib/admin-session";
import { DEMO_DISABLED_MESSAGE, DEMO_MODE } from "@/lib/demo";
import { percent } from "@/lib/format";
import type { CommentPage } from "@/lib/petition";
import type { Stats } from "@/lib/server/posthog";
import type { Petition } from "@/lib/types";
import { AdminShell } from "./AdminShell";

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
  const maxReferrer = Math.max(1, ...(stats.data?.referrers.map((r) => r.count) ?? []));

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
    <AdminShell email={session.email}>
      <section aria-label="Traffic, last 7 days" className="grid gap-4 sm:grid-cols-3 md:gap-6">
        <Metric icon={<BarChart3 />} label="Page views (7d)" value={stats.data?.pageviews} />
        <Metric icon={<Users />} label="Visitors (7d)" value={stats.data?.visitors} />
        <Metric
          icon={<PenLine />}
          label="Signatures"
          value={petition.signatureCount}
          note={`${percent(petition.signatureCount, petition.goal)}% of goal`}
        />
      </section>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Top sources</CardTitle>
            <CardDescription>Last 7 days{stats.data?.sample && " · sample data"}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isError && <p className="text-sm text-destructive">Could not load analytics.</p>}
            <ul className="space-y-4">
              {stats.data?.referrers.map((r) => (
                <li key={r.source} className="text-sm">
                  <div className="flex justify-between">
                    <span>{r.source}</span>
                    <span className="text-muted-foreground tabular-nums">{r.count.toLocaleString("en-US")}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / maxReferrer) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Signature goal shown on the progress bar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="goal">Max signatures</Label>
            <div className="flex gap-2">
              <Input
                id="goal"
                type="number"
                min={1}
                value={goal}
                onChange={(e) => (DEMO_MODE ? toast(DEMO_DISABLED_MESSAGE) : setGoal(Number(e.target.value)))}
              />
              <Button onClick={() => guarded(() => api("/api/admin/petition", { method: "PATCH", body: JSON.stringify({ goal }) }), "Goal updated")}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Pinned comments stay at the top of the public list.</CardDescription>
        </CardHeader>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 sm:px-6 font-medium">Signer</th>
                <th className="px-4 py-3 sm:px-6 font-medium">Comment</th>
                <th className="hidden px-4 py-3 font-medium whitespace-nowrap sm:table-cell sm:px-6">Signed</th>
                <th className="px-4 py-3 sm:px-6 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comments.isError && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-destructive">Could not load comments.</td>
                </tr>
              )}
              {comments.data?.comments.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium sm:px-6 sm:whitespace-nowrap">
                    {c.name}
                    {c.pinned && <Badge className="ml-2">Pinned</Badge>}
                  </td>
                  <td className="max-w-md px-4 py-3 sm:px-6 break-words text-muted-foreground">{c.message}</td>
                  <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground sm:table-cell sm:px-6">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 sm:px-6 text-right">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={c.pinned ? `Unpin comment by ${c.name}` : `Pin comment by ${c.name}`}
                      onClick={() =>
                        guarded(
                          () => api(`/api/admin/comments/${c.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !c.pinned }) }),
                          c.pinned ? "Unpinned" : "Pinned",
                        )
                      }
                    >
                      {c.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value?: number; note?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted [&_svg]:size-6" aria-hidden>
        {icon}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value === undefined ? "…" : value.toLocaleString("en-US")}</p>
        {note && <Badge>{note}</Badge>}
      </div>
    </div>
  );
}
