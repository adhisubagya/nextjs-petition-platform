"use client";

import { useState } from "react";
import type { CommentPage } from "@/lib/petition";
import type { Comment, Petition } from "@/lib/types";
import { CommentList } from "./CommentList";
import { ProgressBar } from "./ProgressBar";
import { SignForm } from "./SignForm";

// Holds comments signed in this session so they appear instantly (and, in Demo Mode, only here).
export function PetitionBody({ petition, initialPage }: { petition: Petition; initialPage: CommentPage }) {
  const [added, setAdded] = useState<Comment[]>([]);
  return (
    <>
      <ProgressBar count={petition.signatureCount + added.length} goal={petition.goal} />
      <SignForm onSigned={(c) => setAdded((prev) => [c, ...prev])} />
      <CommentList initialPage={initialPage} prepend={added} />
    </>
  );
}
