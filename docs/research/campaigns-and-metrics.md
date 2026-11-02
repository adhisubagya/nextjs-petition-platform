# Campaigns and dashboard metrics — research

Date: 2026-11-02 · Status: research, nothing built yet · Base: `dev` @ 5dffaaf

Two features for the admin panel:

1. **Create a campaign** with title, subtitle, description, milestones, signer goal, start date (with a "Today" shortcut) and an end date or "Indefinitely".
2. **Dashboard metrics** that show gain or loss over a chosen period (24h … all time) against the previous equal period.

## 1. Where the code is today

| Area | Today | Gap |
|---|---|---|
| Data model | One `petitions/{PETITION_ID}` doc (`title`, `description`, `goal`, `signatureCount`) with `comments/` and private `signers/` subcollections. `src/lib/types.ts` | No subtitle, milestones, dates or status. One campaign per deployment, picked by env var. |
| Admin writes | `PATCH /api/admin/petition` (goal only), comment pin. Both return 403 in Demo Mode and call `revalidatePath("/")`. | No create/list/edit campaign. |
| Public page | `/` renders the one petition, `revalidate = 86400`. | No route per campaign, no "not started / ended" state. |
| Signing | `POST /api/comments`: signature = comment + signer doc + `signatureCount++` in one transaction. | Never checks whether the campaign is open. |
| Metrics | `getStats()` runs 2 HogQL queries (7-day page views, visitors, top 5 referrers), cached 1 h. Signatures = the live counter only. | No time series, no ranges, no comparison, no charts. |
| PostHog | `posthog.init` with defaults (auto page views). No custom events. | Can't measure the sign funnel, share clicks or conversion. |
| UI kit | shadcn copied by hand: Button, Card, Input, Label, Badge. No Radix, no `components.json`, no chart tokens (ADR 0002). | Needs Calendar, Popover, Checkbox, Field, Textarea, ToggleGroup, Select, Chart. |

## 2. Campaign creation

### 2.1 Data model — recommend multi-campaign, in the existing collection

Keep the `petitions` collection (no data migration; rules and indexes already cover it) and treat each doc as a campaign. The doc id becomes the URL slug.

```ts
// petitions/{slug}
type Campaign = {
  title: string;            // 1–120
  subtitle: string;         // 0–200, shown under the title and as the OG description
  description: string;      // 1–5000 plain text, paragraphs by blank line
  goal: number;             // signer target, 1–100,000,000
  milestones: { count: number; label: string }[]; // ascending, each < goal, max 10
  startAt: Timestamp;       // UTC instant
  endAt: Timestamp | null;  // null = Indefinitely
  timeZone: string;         // IANA, default "Asia/Jakarta"; used for date inputs and chart buckets
  status: "draft" | "published"; // the only stored state; the rest is derived
  signatureCount: number;   // unchanged
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Why multi-campaign instead of "edit the one campaign": "create a new campaign" implies more than one exists (past, current, upcoming). The cost is small because comments and signers are already subcollections of the campaign doc.

Routing: `/c/[slug]` per campaign; `/` shows the **featured** campaign (see Q1). `PETITION_ID` stays as the fallback so the current deploy keeps working unchanged.

### 2.2 Publish state — store little, derive the rest

Only `status` is stored. The phase shown in the admin list and on the page is computed:

| Phase | Rule |
|---|---|
| Draft | `status == "draft"` |
| Scheduled | published and `now < startAt` |
| Live | published and `startAt <= now` and (`endAt == null` or `now < endAt`) |
| Ended | published and `endAt != null` and `now >= endAt` |

One pure function `campaignPhase(c, now)` with unit tests on the boundaries covers it.

Date semantics (date-only pickers, the way people think about campaigns):

- **Start** = 00:00 of the chosen day in `timeZone`. **Today** sets the date to today, so the campaign goes live as soon as it is published.
- **End** = 23:59:59.999 of the chosen day in `timeZone` (inclusive). **Indefinitely** checked → `endAt = null` and the end picker is disabled.
- Stored as UTC `Timestamp`s. `date-fns` (installed) plus `@date-fns/tz` (small, official) converts local day ↔ UTC instant.
- Later, if needed: a time field for "starts at 19:00".

### 2.3 Scheduling vs the 24-hour cache

The page is cached for 24 h, so a scheduled campaign would not flip to live until the next regeneration.

| Option | Precision | Cost | Verdict |
|---|---|---|---|
| A. Phase checked in the browser + enforced by the server | exact | none | **Baseline.** The cached HTML carries `startAt`/`endAt`; a small client component shows "Opens in 3 days", the sign form, or "Closed" from the visitor's clock. `POST /api/comments` rejects outside the live window (403), so a wrong clock can't sign early or late. |
| B. Upstash QStash one-off message at `startAt` and `endAt` → `POST /api/revalidate` | seconds | free tier covers it; Upstash already in use | **Add for live mode.** Makes the cached HTML itself correct (OG tags, "Closed" text for crawlers, scheduled text hidden until start). Re-schedule on edit; verify the QStash signature. |
| C. Vercel Cron | once a day on Hobby | free | Too coarse. |
| D. Lower `revalidate` | minutes | more Firestore reads | Undoes ADR 0001. |

Caveat for A alone: a scheduled campaign's text is in the public HTML before it starts. If it must stay secret until launch, don't render scheduled campaigns publicly and use B to reveal them at `startAt` (Q5). Demo Mode uses A only.

Every admin save keeps calling `revalidatePath` for the campaign path and `/`.

### 2.4 Zod schema (sketch)

```ts
const milestone = z.object({
  count: z.number().int().min(1),
  label: z.string().trim().min(1).max(80),
});

export const campaignInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    subtitle: z.string().trim().max(200).default(""),
    description: z.string().trim().min(1, "Description is required").max(5000),
    goal: z.number().int().min(1).max(100_000_000),
    milestones: z.array(milestone).max(10).default([]),
    startDate: z.iso.date(),            // "2026-11-02", a day in timeZone
    endDate: z.iso.date().nullable(),   // null when Indefinitely is checked
    timeZone: z.string().refine(isIanaZone).default("Asia/Jakarta"),
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, { path: ["endDate"], message: "End must be on or after start" })
  .refine((v) => v.milestones.every((m) => m.count < v.goal), { path: ["milestones"], message: "Milestones must be below the goal" })
  .refine((v) => v.milestones.every((m, i, a) => i === 0 || m.count > a[i - 1].count), { path: ["milestones"], message: "Milestones must be ascending" });
```

The form keeps an `indefinitely` boolean for the checkbox and maps it to `endDate: null`. The slug is derived from the title on create (editable, `^[a-z0-9-]{3,60}$`, uniqueness checked in the create transaction). A start date in the past is only allowed when editing an existing campaign. The same schema runs on the client (React Hook Form resolver) and the server, like `commentInputSchema` today.

### 2.5 Demo Mode

Same pattern as goal and pin today, so the portfolio shows the whole flow:

- The create form is fully usable: validation, Today shortcut, Indefinitely, milestone rows, live preview card.
- **Save** shows the toast "Action disabled in Demo Mode."; the API returns 403 before touching Firestore.
- The admin campaign list is seed data with one campaign in each phase (draft, scheduled, live, ended) so every state is visible.

### 2.6 shadcn/ui pieces (checked against the live registry, new-york-v4)

| Need | Registry item | Pulls in |
|---|---|---|
| Form layout + errors with React Hook Form | `field` (newer replacement for the `form` wrapper), pattern from `form-rhf-demo` | `separator` |
| Milestone rows (add / remove) | `form-rhf-array` example (`useFieldArray`) | `input-group` |
| Description | `textarea` | — |
| Start / end date | `calendar` + `popover`; `date-picker-with-presets` shows the preset pattern for **Today** | `react-day-picker`, Radix Popover |
| Indefinitely | `checkbox` (`field-checkbox` layout) | Radix Checkbox |
| Draft / Publish | `button`, `alert-dialog` to confirm publishing | Radix Alert Dialog |
| Campaign list | `table` + `badge` per phase | — |
| Create / edit surface | own page `/admin/campaigns/new` (simplest), or `sheet` | — |

This ends ADR 0002's "no Radix" rule. All of it is admin-only, so the cached public page doesn't grow. Write ADR 0004 when building, and add `components.json` so the shadcn CLI installs items instead of copy-paste.

## 3. Dashboard metrics

### 3.1 What can be collected, and from where

| Metric | Source | Exists? | How |
|---|---|---|---|
| Signatures per bucket, cumulative, gain vs previous period | Firestore | add | Daily rollup doc written in the signing transaction (§3.3) |
| Comments | Firestore | same as signatures | Every signature is a comment here, so show one number |
| Progress to goal, milestones reached and when | Firestore | add | `signatureCount` vs `goal`; reached date = first day the cumulative series passes the milestone |
| Pace to goal | derived | add | Needed per day = remaining ÷ days left (only with an end date); projected finish = remaining ÷ 7-day average |
| Page views, unique visitors, sessions | PostHog | partial | HogQL on `events` (already used) |
| Bounce rate, session length | PostHog | add | HogQL `sessions` table (`$is_bounce`, `$session_duration`) |
| New vs returning visitors | PostHog | add | Person first seen before the period start |
| Conversion (visitors → signers) | PostHog + Firestore | add | Signatures ÷ unique visitors for the same period |
| Sign funnel: view → started → code sent → verified → signed | PostHog | add | Custom events `sign_started`, `code_requested`, `code_verified`, `signature_submitted`; no personal data in properties |
| Referrers, UTM source / campaign | PostHog | partial | `$referring_domain`, `utm_*` |
| Share channel clicks (WhatsApp, X, copy link…) | PostHog | add | `share_clicked {channel}` in `ShareButtons` |
| Countries, devices, browsers | PostHog | add | `$geoip_country_code`, `$device_type`, `$browser` |
| Sign-in codes sent per provider vs daily cap | Upstash | yes | `mail:{provider}:{date}` counters already exist |
| Email bounces / delivery | provider | no | Needs Brevo/Resend webhooks; later, live mode only |
| Rate-limit blocks | Upstash | add | `INCR metric:{date}:rl:{limiter}` on every 429 |
| Turnstile failures, honeypot hits | Upstash | add | Same counter pattern in `POST /api/comments` and `/api/auth/code` |

Vercel Web Analytics overlaps with PostHog and isn't needed.

### 3.2 Time ranges and granularity

"24h" and "1D" are the same, so keep one. Recommended presets:

| Range | Bucket | Points | Compared with |
|---|---|---|---|
| 24h | 1 hour | 24 | previous 24 h |
| 3D | 3 hours | 24 | previous 3 days |
| 7D | 6 hours | 28 | previous 7 days |
| 30D | 1 day | 30 | previous 30 days |
| 3M | 1 day | ~90 | previous 3 months |
| 6M | 1 week | 26 | previous 6 months |
| 1Y | 1 week | 52 | previous year |
| All | 1 month (1 week if under 6 months) | varies | none |

Rules:

- Buckets in the campaign's time zone (WIB by default), so "today" matches the admin's wall clock. Weeks start Monday.
- The current bucket is partial: draw it lighter and leave it out of the delta.
- Delta = this period vs the previous period of the same length, shown as `+12.4% (+318)` with an arrow and the words up/down, never color alone. When the previous period is 0, show "new" instead of a percentage.
- Ranges longer than the campaign are clipped to its start; the comparison is hidden when no full previous period exists.
- Default view 7D. The range lives in the URL (`?range=30d`) so links reproduce the view.

### 3.3 Storage and cost

**Signatures: Firestore daily rollups, written with the signature.** In the existing transaction in `POST /api/comments`, add:

```ts
tx.set(petition.collection("daily").doc("2026-11-02"),
  { signatures: FieldValue.increment(1), [`h.${hour}`]: FieldValue.increment(1) }, { merge: true });
```

One doc per day holds the day total and 24 hourly buckets. 1Y reads at most 366 small docs; coarser buckets are summed in code.

| | Per signature | Per dashboard load (1Y) | Spark free tier |
|---|---|---|---|
| Writes | 4 instead of 3 | 0 | 20,000/day |
| Reads | — | ≤ 366, cached 5 min | 50,000/day |

The alternative, a Firestore `count()` per bucket on `signers` by `createdAt`, adds no write but needs up to 52 queries per chart. Rollups are simpler and cheaper.

**Traffic: PostHog HogQL, cached hard.** PostHog's API docs list the query endpoint at **120 requests per hour for the whole organisation**. So:

- One HogQL query per range returns all bucketed series (`toStartOfInterval(timestamp, INTERVAL n HOUR, 'Asia/Jakarta')` with `countIf` per metric), over a window twice as long so the previous period comes back in the same call. A second query returns the breakdowns (referrer, country, device, share channel).
- Cache per (campaign, range): 10 min for 24h/3D, 1 h for 7D–3M, 6 h for 6M and longer. That stays well under the limit with several admins.
- On error or a missing key, fall back to sample data (current behaviour) and badge it "sample".
- PostHog's free tier is 1M events a month; page views plus five funnel events stay far below that here. Confirm the free plan's data retention before promising a multi-year "All" range for traffic; signature history comes from Firestore and is unaffected.

**Security counters: Upstash** `metric:{date}:{name}` with a 400-day TTL, read with one `MGET` per range.

### 3.4 Dashboard layout and charts

One filter row at the top: campaign select, then the range control (ToggleGroup on desktop, Select on mobile, the same pattern as shadcn's `chart-area-interactive`). Every card below follows that one range.

1. **KPI row (stat tiles, not charts):** signatures in period, unique visitors, conversion %, progress to goal. Each tile: value, delta vs previous period with arrow and text, tiny sparkline. Pattern: `section-cards` in `dashboard-01`.
2. **Signatures over time:** single-series area chart; previous period as a muted dashed line on the same axis (same measure, so one axis is valid). Toggle per-bucket / cumulative. In cumulative mode, milestones and the goal are horizontal reference lines with direct labels.
3. **Pace card:** meter for progress to goal plus "need 312/day, averaging 280/day, projected 14 Dec". With Indefinitely, only the projected date.
4. **Visitors and sessions:** line chart with two series (legend and direct labels). Bounce rate and median session length as stat tiles beside it, not on a second y-axis.
5. **Funnel:** horizontal bars view → started → code sent → verified → signed, with step-to-step %.
6. **Breakdowns:** ranked horizontal bars in one hue for referrers, share channels, countries, devices; top 6 + "Other".
7. **Health (live mode):** codes sent per provider as meters against daily caps; rate-limit blocks, Turnstile failures and honeypot hits as small stat tiles with deltas.

Chart rules for the build: one y-axis per chart; categorical colors assigned per entity in a fixed order, never by rank; 2 px lines; hover crosshair and tooltip on every line and area; a "View as table" toggle per chart; dark-mode colors chosen and validated separately against the dark card surface; when the range changes, keep the old chart at reduced opacity while loading instead of a skeleton.

Charts use shadcn `chart` (Recharts 3.8 with `ChartContainer` / `ChartTooltip`). Add `--chart-1…5` tokens to `globals.css`. The theme is monochrome, so the main series can stay neutral, but up/down deltas need a validated color pair. Load the chart cards with `next/dynamic` so Recharts stays out of every other bundle.

### 3.5 Demo Mode

Demo writes nothing, so the rollups would be flat. Generate a deterministic sample series from the seed (fixed seed, growth curve ending at 8,452 signatures, weekly rhythm, one share spike) for every range, and badge those cards "sample data". Traffic stays real PostHog data when the key is set (it is on the live demo), sample otherwise.

## 4. Recommended plan and task breakdown

The model and phase logic unblock both features, so they go first.

| # | Task | Tier | Notes |
|---|---|---|---|
| 1 | ADR 0004 (multi-campaign, Radix and Recharts in admin) and `components.json` | S | docs |
| 2 | Campaign type, Zod schema, `campaignPhase()`, day ↔ UTC helpers with tests; seed with 4 phases | M | `@date-fns/tz` |
| 3 | `/c/[slug]` route, featured campaign on `/`, client phase banner, server rejects signing outside the live window | M | keeps `PETITION_ID` fallback |
| 4a | Admin campaign list and `POST/PATCH /api/admin/campaigns` (403 in Demo Mode) | M | |
| 4b | Create / edit form: Field, Calendar, Popover, Checkbox, milestone array, preview, Demo Mode toast | M | Radix enters here |
| 5 | Milestones on the public page (progress bar ticks, "next milestone") | S | |
| 6 | QStash publish / close revalidation (live mode) | M | signature verification |
| 7 | Daily rollup write in the signing transaction + range read API | M | |
| 8 | PostHog custom events (sign funnel, share clicks) | S | client only |
| 9 | Range model (presets, buckets, previous period, delta) with tests; HogQL query builder with caching | M | pure functions first |
| 10a | Dashboard filter row and KPI tiles with deltas | M | |
| 10b | Signatures chart with milestones, pace card | M | shadcn `chart` |
| 11 | Traffic, funnel and breakdown cards | M | |
| 12 | Health counters (rate-limit, Turnstile, honeypot) and provider quota meters | S | Upstash |
| 13 | Demo sample series generator | S | |

Totals: 10 M, 5 S, no L after splitting. Suggested order: **Campaigns** (1–5), then **Metrics** (7–13); 6 waits for go-live.

## 5. Open questions

1. **Several live campaigns at once?** If yes, what does `/` show: the newest live one, one you mark as featured, or a list?
2. **Milestones:** signature thresholds with a label (e.g. 5,000 → "Delivered to council") as assumed, or dated events / progress updates?
3. **Description format:** plain text with paragraphs (assumed), or Markdown (bold, links, lists)?
4. **Time zone:** WIB for everything, or per campaign? Are whole days enough, or is a start/end time needed?
5. **Scheduled campaigns:** must their text stay hidden until the start date (needs task 6), or is a visible "Opens in 3 days" fine?
6. **After the end date:** keep the page up as "Closed" with the final count (assumed), or hide it?
7. **Editing a live campaign:** goal and end date editable, start date locked once live (assumed)?
8. **Ranges:** are the presets in §3.2 right, and should "All" for traffic go beyond PostHog's retention or show signatures only?

## Sources

- shadcn registry, new-york-v4 style, fetched 2026-11-02 from `ui.shadcn.com/r`: `chart` (recharts 3.8.0), `calendar` (react-day-picker), `field`, `form-rhf-array`, `date-picker-with-presets`, `chart-area-interactive`, `dashboard-01`.
- PostHog API docs, rate limits (query endpoint 120/hour, organisation-wide): https://www.posthog.com/docs/api. Pricing and retention pages could not be fetched; confirm retention before relying on it.
- Repo: `src/lib/petition.ts`, `src/app/api/comments/route.ts`, `src/lib/server/posthog.ts`, `src/lib/server/ratelimit.ts`, `src/lib/server/email.ts`, ADR 0001, ADR 0002.
