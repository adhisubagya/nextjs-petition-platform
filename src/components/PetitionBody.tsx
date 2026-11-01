"use client";

import { useState } from "react";
import { useSigner } from "@/lib/signer-session";
import type { CommentPage } from "@/lib/petition";
import type { Comment, Petition } from "@/lib/types";
import { CommentList } from "./CommentList";
import { ProgressBar } from "./ProgressBar";
import { ShareCard } from "./ShareCard";
import { SignInCard } from "./SignInCard";
import { SignForm } from "./SignForm";

// Holds comments signed in this session so they appear instantly (and, in Demo Mode, only here).
export function PetitionBody({ petition, initialPage }: { petition: Petition; initialPage: CommentPage }) {
  const [added, setAdded] = useState<Comment[]>([]);
  const { signer, signIn, markSigned, signOut } = useSigner();
  return (
    // Mobile order: progress, form, comments. Desktop: form pinned in the right column.
    <div className="mt-14 grid animate-fade-up gap-6 [animation-delay:150ms] lg:grid-cols-[1fr_380px]">
      <ProgressBar count={petition.signatureCount + added.length} goal={petition.goal} />
      <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        {!signer ? (
          <SignInCard onSignedIn={signIn} />
        ) : signer.signed ? (
          <ShareCard title={petition.title} />
        ) : (
          <SignForm
            email={signer.email}
            onSignOut={signOut}
            onSigned={(c) => {
              setAdded((prev) => [c, ...prev]);
              markSigned();
            }}
          />
        )}
      </div>
      <CommentList initialPage={initialPage} prepend={added} />
    </div>
  );
}
