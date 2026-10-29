import { formatDistanceToNow } from "date-fns";
import { Pin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Comment } from "@/lib/types";

export function CommentCard({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40">
      {comment.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ~50KB avatars from Storage; no optimisation needed
        <img src={comment.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-border" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
          <UserRound className="size-5 text-muted-foreground" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{comment.name}</span>
          <Badge>Signer</Badge>
          {comment.pinned && (
            <Badge>
              <Pin className="size-3" aria-hidden /> Pinned
            </Badge>
          )}
          {/* Relative time drifts between the cached HTML and the client render. */}
          <time className="ml-auto text-xs text-muted-foreground" dateTime={comment.createdAt} suppressHydrationWarning>
            Signed {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </time>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed break-words text-muted-foreground">{comment.message}</p>
      </div>
    </li>
  );
}
