# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security

- Firestore rules hide draft and soft-deleted campaigns from client reads; `signers/` and `daily/` stay server-only.
- Signing is refused (403) outside a campaign's Live window, for drafts, deleted and unknown campaigns, checked inside the signing transaction on the server clock; Demo Mode answers follow the same window. The signature that reaches the goal records `goalReachedAt` once, signing stays open past the goal, and each signature adds to a per-day, per-hour rollup.
- Live mode (still off): only accounts from email-code sign-in can sign or upload avatars (custom `signer` claim), signer uids are keyed with `SIGNER_ID_SECRET` so avatar paths don't reveal emails, sign-in codes are capped at 5 per email per day, and avatars must be WebP, PNG or JPEG.
- Live mode (still off): signing requires a Firebase ID token from email-code sign-in, one signature per account via a `signers/{uid}` doc in the same transaction, Turnstile refuses missing or test secret keys, avatar uploads require sign-in into the signer's own folder, and `CSP_ENFORCE=true` switches the full CSP from report-only to enforced.
- Security headers on every response (clickjacking block, nosniff, referrer and permissions policy), a report-only CSP, and no `x-powered-by`; the comments API rejects malformed cursors and rate-limits paginated reads.

### Changed

- ADR 0004: many campaigns per deployment, derived campaign phases, and Radix, Tiptap and Recharts allowed in admin-only components; `components.json` for the shadcn CLI and chart colour tokens.
- Theme moved to shadcn/ui neutral design tokens with Geist font; dark theme is the default, with a light/dark toggle.
- Petition page redesigned: sticky blurred header, gradient hero, progress card, two-column layout with a sticky sign form, and a dark OG image.
- Admin redesigned on a TailAdmin-style layout: sidebar, sticky header, metric cards, source bars and a comments table; login moved into a card.
- Runtime moved to Node 24 (engines, `.nvmrc`, CI) to match `@firebase/auth` requirements.
- Install-script policy (`allowScripts`) for npm 12 and a `rimraf` override that drops deprecated `glob@10` from the install.

### Added

- Nightly rollup at /api/cron/rollup (Vercel Cron, 00:30 UTC): copies PostHog page views, visitors, sessions, bounces, session time, funnel steps and the top referrers, countries, devices and share channels into each campaign's daily docs. Requires CRON_SECRET, is idempotent, never touches signature counts, and backfills up to a year a few chunks per run.
- Dashboard range model: 24h, 3D, 7D, 30D, 3M, 6M, 1Y and All with buckets in the campaign time zone (weeks from Monday), a previous period of equal length, and deltas that leave out the partial current bucket.
- Analytics events for the dashboard funnel: sign_started, code_sent, code_verified, signed and share_clicked (whatsapp, x, copy, native), each with the campaign slug and no personal data; nothing is sent when PostHog is not configured.
- Confirm dialogs: publishing a draft, moving the start of a live campaign (says whether signing closes until then), and deleting a campaign, which needs its link typed in; in Demo Mode the dialogs work and the final button shows the Demo Mode message.
- Campaign form: Tiptap rich text description (headings, emphasis, lists, quotes, safe links only) with a preview rendered by the public renderer, and milestone rows with add, remove and Generate up to goal; the editor loads only in the admin form.
- Campaign form (new and edit): title with auto link, subtitle, goal, time zone picker from the browser's zone list, start and end date and time read in that zone, Today and Indefinitely, draft or published; validated with the same schema as the API, and stopped with the Demo Mode message after validation.
- Admin Campaigns page: every campaign with phase, Achieved and Featured badges, signatures against goal and start time in its zone; feature, delete and restore (Deleted filter); admin pages share one sign-in gate and get a section menu on mobile.
- Admin campaign API: list all campaigns (drafts and deleted included), create (slug reserved forever), full edit with `goalReachedAt` following goal changes, feature toggle keeping one featured campaign, soft delete and restore; every write is 403 in Demo Mode and revalidates `/` and the campaign page.
- Landing page `/` lists campaigns: featured, newest live, then every public campaign newest first with pagination (`/api/campaigns`, edge-cached for an hour); regenerated hourly.
- Campaign page at `/c/[slug]`: rich description rendered on the server, phase badge with countdown and campaign time zone, Achieved badge, closed state with the sign form replaced, progress past 100% and milestone ticks; drafts and deleted campaigns are 404. `/` shows the default campaign the same way for now.
- Campaign model: Zod schema with a StarterKit-only rich text check (safe links, size and depth caps), derived phases (draft, scheduled, live, ended), wall-clock ↔ UTC conversion per IANA time zone, a suggested milestone ladder, and five seed campaigns covering every state.
- Hold to sign: the Sign button is now a press-and-hold "Leaving Thumbprint" button whose thumbprint fills in while held (mouse, touch, or holding Space/Enter); releasing early cancels, and reduced-motion users get a stepped fill.
- Live-mode email delivery for sign-in codes with ordered free-provider fallback (Brevo → Resend → Mailjet), per-provider daily counters in Upstash and instant failover on 429/5xx. Off while Demo Mode is on.
- Email + 6-digit code sign-in before signing (ADR 0003). In Demo Mode no email is sent and the code is shown on screen.
- "Send as Anonymous" (checked by default), honeypot and spam checks on comments, and a share card (OS share sheet, WhatsApp, X, copy link for Discord) that replaces the form after signing.
- Site-wide copyright footer ("© 2026 DAWN. All rights reserved.").
