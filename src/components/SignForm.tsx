"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEMO_MODE } from "@/lib/demo";
import { commentInputSchema, MESSAGE_MAX, NAME_MAX } from "@/lib/schemas";
import { siteKey } from "@/lib/turnstile";
import type { Comment } from "@/lib/types";

const formSchema = commentInputSchema.omit({ avatarUrl: true });
type FormValues = { name: string; message: string };


export function SignForm({ onSigned }: { onSigned: (comment: Comment) => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: FormValues) {
    setStatus(null);
    try {
      // Loaded on demand so Firebase Storage and the compressor stay out of the first page load.
      const { compressAvatar, uploadAvatar } = await import("@/lib/avatar");
      const small = avatar ? await compressAvatar(avatar) : null;
      // Demo Mode keeps Storage at zero writes too; the preview uses a local object URL.
      const avatarUrl = small && !DEMO_MODE ? await uploadAvatar(small) : null;
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, avatarUrl, turnstileToken: token }),
      });
      const body = await res.json();
      if (!res.ok) return setStatus(body.error ?? "Something went wrong.");
      onSigned({ ...body.comment, avatarUrl: body.comment.avatarUrl ?? (small && URL.createObjectURL(small)) });
      reset();
      setAvatar(null);
      setStatus(body.demo ? "Thanks for signing! (Demo Mode: nothing was saved.)" : "Thanks for signing!");
    } catch {
      setStatus("Network error. Please try again.");
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Sign the petition</CardTitle>
        <CardDescription>Add your name and a short message of support.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" maxLength={NAME_MAX} placeholder="Your name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !token}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {isSubmitting ? "Signing…" : "Sign Petition"}
          </Button>
          {status && <p role="status" className="text-center text-sm text-muted-foreground">{status}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
