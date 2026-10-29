import { formatDistanceToNow } from "date-fns";
import { Pin, UserRound } from "lucide-react";
import type { Comment } from "@/lib/types";

export function CommentCard({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border p-4">
      {comment.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ~50KB avatars from Storage; no optimisation needed
        <img src={comment.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-5 text-muted-foreground" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{comment.name}</span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Signer</span>
          {comment.pinned && <Pin className="size-3.5 text-muted-foreground" aria-label="Pinned" />}
          {/* Relative time drifts between the cached HTML and the client render. */}
          <time className="text-muted-foreground" dateTime={comment.createdAt} suppressHydrationWarning>
            Signed {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </time>
        </div>
        <p className="mt-1 break-words text-muted-foreground">{comment.message}</p>
      </div>
    </li>
  );
}
