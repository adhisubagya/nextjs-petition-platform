# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Theme moved to shadcn/ui neutral design tokens with Geist font; dark theme is the default, with a light/dark toggle.
- Petition page redesigned: sticky blurred header, gradient hero, progress card, two-column layout with a sticky sign form, and a dark OG image.
- Admin redesigned on a TailAdmin-style layout: sidebar, sticky header, metric cards, source bars and a comments table; login moved into a card.
- Runtime moved to Node 24 (engines, `.nvmrc`, CI) to match `@firebase/auth` requirements.
- Install-script policy (`allowScripts`) for npm 12 and a `rimraf` override that drops deprecated `glob@10` from the install.

### Added

- Site-wide copyright footer ("© 2026 DAWN. All rights reserved.").
