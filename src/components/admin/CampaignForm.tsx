"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { adminApi } from "@/lib/admin-api";
import type { Campaign } from "@/lib/campaign";
import { fieldFor, slugify, soon, toFormValues, toInput, type CampaignFormValues } from "@/lib/campaign-form";
import { campaignInputSchema } from "@/lib/campaign-schema";
import { DEMO_DISABLED_MESSAGE, DEMO_MODE } from "@/lib/demo";
import { useAdminSession } from "./AdminGate";

type Values = CampaignFormValues;

// The same schema as the API, applied to the mapped values; issues land on the field that shows them.
const resolver: Resolver<Values> = async (values) => {
  const parsed = campaignInputSchema.safeParse(toInput(values));
  if (parsed.success) return { values, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of parsed.error.issues) {
    const key = fieldFor[String(issue.path[0])] ?? String(issue.path[0]);
    const message = issue.code === "invalid_format" && (key === "startDate" || key === "endDate") ? "Pick a date and a time" : issue.message;
    errors[key] ??= { type: "validate", message };
  }
  return { values: {}, errors: errors as FieldErrors<Values> };
};

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function CampaignForm({ campaign }: { campaign: Campaign | null }) {
  const session = useAdminSession();
  const router = useRouter();
  const qc = useQueryClient();
  const editing = campaign !== null;
  const [slugTouched, setSlugTouched] = useState(editing);
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const { register, handleSubmit, watch, setValue, formState } = useForm<Values>({
    resolver,
    defaultValues: toFormValues(campaign, browserZone()),
  });
  const { errors, isSubmitting } = formState;
  const indefinitely = watch("indefinitely");

  async function onSubmit(values: Values) {
    // Demo Mode: the form validates like the real thing, then stops before the API.
    if (DEMO_MODE) return void toast(DEMO_DISABLED_MESSAGE);
    try {
      const path = editing ? `/api/admin/campaigns/${campaign.slug}` : "/api/admin/campaigns";
      await adminApi(session, path, { method: editing ? "PUT" : "POST", body: JSON.stringify(toInput(values)) });
      toast.success(editing ? "Campaign saved" : "Campaign created");
      await qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      router.push("/admin/campaigns");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const error = (name: keyof Values) =>
    errors[name]?.message && (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {String(errors[name]?.message)}
      </p>
    );
  const aria = (name: keyof Values) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Campaign</CardTitle>
          <CardDescription>Shown on the campaign page, the landing page and link previews.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...aria("title")}
              {...register("title", {
                onChange: (e) => !slugTouched && setValue("slug", slugify(e.target.value)),
              })}
            />
            {error("title")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Link</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/c/</span>
              <Input id="slug" readOnly={editing} {...aria("slug")} {...register("slug", { onChange: () => setSlugTouched(true) })} />
            </div>
            <p className="text-xs text-muted-foreground">
              {editing ? "The link can't change once created." : "Lowercase letters, digits and dashes. Fixed once created."}
            </p>
            {error("slug")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" {...aria("subtitle")} {...register("subtitle")} />
            {error("subtitle")}
          </div>
          <div className="grid gap-2 sm:max-w-48">
            <Label htmlFor="goal">Signature goal</Label>
            <Input id="goal" type="number" min={1} inputMode="numeric" {...aria("goal")} {...register("goal", { valueAsNumber: true })} />
            {error("goal")}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Times are read in the campaign&apos;s time zone. Signing is open from the start until the end.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="timeZone">Time zone</Label>
            <Input id="timeZone" list="time-zones" autoComplete="off" {...aria("timeZone")} {...register("timeZone")} />
            <datalist id="time-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            {error("timeZone")}
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Start</legend>
            <div className="flex flex-wrap gap-2">
              <Input type="date" aria-label="Start date" className="w-auto" {...aria("startDate")} {...register("startDate")} />
              <Input type="time" aria-label="Start time" className="w-auto" {...register("startTime")} />
              <Button
                variant="outline"
                onClick={() => {
                  const now = soon(watch("timeZone"));
                  setValue("startDate", now.date);
                  setValue("startTime", now.time);
                }}
              >
                Today
              </Button>
            </div>
            {error("startDate")}
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">End</legend>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" aria-label="End date" className="w-auto" disabled={indefinitely} {...aria("endDate")} {...register("endDate")} />
              <Input type="time" aria-label="End time" className="w-auto" disabled={indefinitely} {...register("endTime")} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" {...register("indefinitely")} />
                Indefinitely
              </label>
            </div>
            {error("endDate")}
          </fieldset>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Drafts are hidden. Published campaigns show at once and open for signing at their start time.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          {(["draft", "published"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input type="radio" value={s} className="size-4 accent-primary" {...register("status")} />
              {s === "draft" ? "Draft" : "Published"}
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {editing ? "Save changes" : "Create campaign"}
        </Button>
        <Link href="/admin/campaigns" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
