"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Pin, PinOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { adminApi } from "@/lib/admin-api";
import { DEMO_DISABLED_MESSAGE, DEMO_MODE } from "@/lib/demo";
import type { CommentPage } from "@/lib/petition";
import type { Petition } from "@/lib/types";
import { useAdminSession } from "./AdminGate";
import { AdminShell } from "./AdminShell";
import { Metrics } from "./metrics/Metrics";

export function Dashboard({ petition }: { petition: Petition }) {
  const session = useAdminSession();
  const qc = useQueryClient();
  const [goal, setGoal] = useState(petition.goal);

  const api = <T,>(path: string, init?: RequestInit) => adminApi<T>(session, path, init);

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
    <AdminShell email={session.email} title="Dashboard">
      <Metrics />

      <div className="grid gap-4 md:gap-6 xl:max-w-md">
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
