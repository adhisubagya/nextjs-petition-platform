"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { DEMO_MODE } from "@/lib/demo";
import { commentInputSchema, MESSAGE_MAX, NAME_MAX } from "@/lib/schemas";
import type { Comment } from "@/lib/types";

const formSchema = commentInputSchema.omit({ avatarUrl: true });
type FormValues = { name: string; message: string };

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
const input = "w-full rounded border border-border px-3 py-2 focus:border-ring bg-transparent focus:outline-none";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-border p-4" noValidate>
      <h2 className="text-lg font-semibold">Sign the petition</h2>
      <div>
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input id="name" maxLength={NAME_MAX} className={input} aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">Comment</label>
        <textarea id="message" rows={3} maxLength={MESSAGE_MAX} className={input} aria-invalid={!!errors.message} {...register("message")} />
        {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>}
      </div>
      <div>
        <label htmlFor="avatar" className="text-sm font-medium">Avatar (optional)</label>
        <input id="avatar" type="file" accept="image/*" className="block text-sm" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
      </div>
      <Turnstile siteKey={siteKey} onSuccess={setToken} onExpire={() => setToken(null)} options={{ size: "flexible" }} />
      <button
        type="submit"
        disabled={isSubmitting || !token}
        className="w-full rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? "Signing…" : "Sign Petition"}
      </button>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
    </form>
  );
}
