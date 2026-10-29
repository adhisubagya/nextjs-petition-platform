"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { CommentPage } from "@/lib/petition";
import { CommentCard } from "./CommentCard";

async function fetchPage(cursor: string | null): Promise<CommentPage> {
  const res = await fetch(`/api/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export function CommentList({ initialPage }: { initialPage: CommentPage }) {
  // cursors[i] is the cursor that loads page i; page 0 has none.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const page = cursors.length - 1;
  const cursor = cursors[page];

  const { data, isFetching, isError } = useQuery({
    queryKey: ["comments", cursor],
    queryFn: () => fetchPage(cursor),
    initialData: page === 0 ? initialPage : undefined,
    placeholderData: keepPreviousData,
  });

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="text-lg font-semibold">
        Recent signers
      </h2>
      {isError && <p className="mt-4 text-sm text-red-700">Could not load comments.</p>}
      <ul className={`mt-4 space-y-3 ${isFetching ? "opacity-60" : ""}`}>
        {data?.comments.map((c) => <CommentCard key={c.id} comment={c} />)}
      </ul>
      <nav className="mt-4 flex justify-between" aria-label="Comment pages">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          disabled={page === 0}
          onClick={() => setCursors((c) => c.slice(0, -1))}
        >
          Previous page
        </button>
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          disabled={!data?.nextCursor || isFetching}
          onClick={() => setCursors((c) => [...c, data!.nextCursor])}
        >
          Next page
        </button>
      </nav>
    </section>
  );
}
