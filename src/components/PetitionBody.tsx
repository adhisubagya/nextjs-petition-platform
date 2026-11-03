"use client";

import { CalendarClock, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campaign } from "@/lib/campaign";
import { useSigner } from "@/lib/signer-session";
import type { CommentPage } from "@/lib/petition";
import type { Comment } from "@/lib/types";
import { formatInZone, usePhase } from "@/lib/use-phase";
import { CommentList } from "./CommentList";
import { ProgressBar } from "./ProgressBar";
import { ShareCard } from "./ShareCard";
import { SignInCard } from "./SignInCard";
import { SignerMenu } from "./SignerMenu";
import { SignForm } from "./SignForm";

// Holds comments signed in this session so they appear instantly (and, in Demo Mode, only here).
type Props = { campaign: Campaign; initialPage: CommentPage; renderedAt: number; shareUrl: string; children?: ReactNode };

export function PetitionBody({ campaign, initialPage, renderedAt, shareUrl, children }: Props) {
  const [added, setAdded] = useState<Comment[]>([]);
  const { signer, signIn, markSigned, unmarkSigned, signOut } = useSigner();
  // The signature made in this view; a restored one (earlier in the tab) shows the "already signed" notice instead.
  const [mine, setMine] = useState<Comment | null>(null);
  const signedHere = !!signer?.signed.includes(campaign.slug);
  const menu = signer && (
    <SignerMenu
      email={signer.email}
      comment={signedHere ? mine : null}
      onEdit={(c) => {
        setAdded((prev) => prev.map((x) => (x.id === c.id ? c : x)));
        setMine(c);
      }}
      onDelete={() => {
        setAdded((prev) => prev.filter((x) => x.id !== mine?.id));
        setMine(null);
        unmarkSigned(campaign.slug);
      }}
      onSignOut={() => {
        setMine(null);
        signOut();
      }}
    />
  );
  const { phase } = usePhase(campaign, renderedAt);
  return (
    // Mobile order: progress, form, comments. Desktop: form pinned in the right column.
    <div className="mt-14 grid animate-fade-up gap-6 [animation-delay:150ms] lg:grid-cols-[1fr_380px]">
      <ProgressBar
        count={campaign.signatureCount + added.length}
        goal={campaign.goal}
        milestones={campaign.milestones}
        dimmed={phase === "ended"}
      />
      <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        {phase !== "live" ? (
          <SigningClosed campaign={campaign} scheduled={phase === "scheduled"} />
        ) : !signer ? (
          <SignInCard onSignedIn={(email) => (setMine(null), signIn(email))} />
        ) : signedHere ? (
          <ShareCard title={campaign.title} url={shareUrl} alreadySigned={!mine} menu={menu} />
        ) : (
          <SignForm
            campaign={campaign.slug}
            email={signer.email}
            menu={menu}
            onSigned={(c) => {
              setAdded((prev) => [c, ...prev]);
              setMine(c);
              markSigned(campaign.slug);
            }}
          />
        )}
      </div>
      <div className="space-y-12">
        {children}
        <CommentList campaign={campaign.slug} initialPage={initialPage} prepend={added} />
      </div>
    </div>
  );
}

// Replaces the sign form outside the Live window; the API refuses signatures there too.
function SigningClosed({ campaign, scheduled }: { campaign: Campaign; scheduled: boolean }) {
  const Icon = scheduled ? CalendarClock : Lock;
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Icon className="mb-1 size-7 text-muted-foreground" aria-hidden />
        <CardTitle className="text-lg">{scheduled ? "Signing opens soon" : "Signing has closed"}</CardTitle>
        <CardDescription>
          {scheduled
            ? `You can sign from ${formatInZone(campaign.startAt, campaign.timeZone)}.`
            : `This campaign closed on ${formatInZone(campaign.endAt ?? campaign.updatedAt, campaign.timeZone)}.`}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
