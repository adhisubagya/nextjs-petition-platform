# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security

- Security headers on every response (clickjacking block, nosniff, referrer and permissions policy), a report-only CSP, and no `x-powered-by`; the comments API rejects malformed cursors and rate-limits paginated reads.

### Changed

- Theme moved to shadcn/ui neutral design tokens with Geist font; dark theme is the default, with a light/dark toggle.
- Petition page redesigned: sticky blurred header, gradient hero, progress card, two-column layout with a sticky sign form, and a dark OG image.
- Admin redesigned on a TailAdmin-style layout: sidebar, sticky header, metric cards, source bars and a comments table; login moved into a card.
- Runtime moved to Node 24 (engines, `.nvmrc`, CI) to match `@firebase/auth` requirements.
- Install-script policy (`allowScripts`) for npm 12 and a `rimraf` override that drops deprecated `glob@10` from the install.

### Added

- Email + 6-digit code sign-in before signing (ADR 0003). In Demo Mode no email is sent and the code is shown on screen.
- "Send as Anonymous" (checked by default), honeypot and spam checks on comments, and a share card (OS share sheet, WhatsApp, X, copy link for Discord) that replaces the form after signing.
- Site-wide copyright footer ("© 2026 DAWN. All rights reserved.").
