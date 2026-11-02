"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { HoldToSign } from "@/components/HoldToSign";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEMO_MODE } from "@/lib/demo";
import { commentFieldsSchema, MESSAGE_MAX, NAME_MAX, hasName, nameIssue } from "@/lib/schemas";
import { siteKey } from "@/lib/turnstile";
import type { Comment } from "@/lib/types";

const formSchema = commentFieldsSchema.omit({ avatarUrl: true }).extend({ anonymous: z.boolean(), website: z.string() }).refine(hasName, nameIssue);
type FormValues = z.infer<typeof formSchema>;


async function liveIdToken() {
  const auth = (await import("@/lib/firebase/client")).clientAuth();
  await auth.authStateReady(); // after a reload the session is restored asynchronously
  return auth.currentUser?.getIdToken() ?? null;
}

type Props = { campaign: string; email: string; onSigned: (comment: Comment) => void; onSignOut: () => void };

export function SignForm({ campaign, email, onSigned, onSignOut }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", message: "", anonymous: true, website: "" },
  });
  const { errors, isSubmitting } = formState;
  const anonymous = watch("anonymous");

  async function onSubmit(values: FormValues) {
    setStatus(null);
    try {
      // Loaded on demand so Firebase Storage and the compressor stay out of the first page load.
      const { compressAvatar, uploadAvatar } = await import("@/lib/avatar");
      const small = avatar ? await compressAvatar(avatar) : null;
      // Live mode: the API checks this Firebase ID token and allows one signature per account.
      const idToken = DEMO_MODE ? null : await liveIdToken();
      // Demo Mode keeps Storage at zero writes too; the preview uses a local object URL.
      const avatarUrl = small && !DEMO_MODE ? await uploadAvatar(small) : null;
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(idToken && { Authorization: `Bearer ${idToken}` }) },
        body: JSON.stringify({ ...values, avatarUrl, turnstileToken: token, campaign }),
      });
      const body = await res.json();
      if (!res.ok) return setStatus(body.error ?? "Something went wrong.");
      // The parent swaps this form for the share card, so there is nothing to reset.
      onSigned({ ...body.comment, avatarUrl: body.comment.avatarUrl ?? (small && URL.createObjectURL(small)) });
    } catch {
      setStatus("Network error. Please try again.");
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Sign the petition</CardTitle>
        <CardDescription>
          Signed in as <span className="text-foreground">{email}</span> ·{" "}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={onSignOut}>
            Sign out
          </button>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Only the hold button signs; Enter in a field must not submit around it. */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4" noValidate>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("anonymous")} />
            <span>
              Send as Anonymous
              <span className="block text-xs text-muted-foreground">Anonymous to the public, not to the organiser.</span>
            </span>
          </label>
          {!anonymous && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" maxLength={NAME_MAX} placeholder="Your name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          )}
          {/* Honeypot: off-screen and skipped by keyboard and screen readers; only bots fill it. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Comment</Label>
            <Textarea id="message" rows={3} maxLength={MESSAGE_MAX} placeholder="Why are you signing?" aria-invalid={!!errors.message} {...register("message")} />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar (optional)</Label>
            <label
              htmlFor="avatar"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
            >
              <ImagePlus className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{avatar ? avatar.name : "Choose an image"}</span>
              <input id="avatar" type="file" accept="image/*" className="sr-only" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Turnstile siteKey={siteKey} onSuccess={setToken} onExpire={() => setToken(null)} options={{ size: "flexible" }} />
          <HoldToSign onComplete={handleSubmit(onSubmit)} disabled={!token} busy={isSubmitting} />
          {status && <p role="status" className="text-center text-sm text-muted-foreground">{status}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
