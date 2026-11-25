# Changelog

All notable changes to this project. Dates are UTC.

## [Unreleased] — 2026-09-29 to 2026-11-25

### Planned (2026-11-25)
- **Watch Board rebuild approved** (DEC-033) after a UX review of the public site:
  Home will lead with legal dates and record changes, and the visual system changes
  (DESIGN_SYSTEM.md). Tasks T-042 to T-048. Not built yet.

### Changed (2026-11-25, T-045)
- **Home is the watch board** (DEC-033). Tiles: the next two legal dates (amber
  within 60 days; a shared date names every law on it), record changes in 30 days,
  records tracked, items collected in 7 days with the number from government sources.
  Panels: Dates ahead (milestones only), Record changes (laws and standards, newest
  first), Laws by stage (every law with its stage track; not yet in force first,
  superseded last), From government sources (tier 1, last 7 days, with the rest counted
  by type). The counter row, Top Developments, the map, Standards Watch, Regulatory
  Pulse, the "Latest" strip and the LIVE dot are gone, which also retires the "High
  impact" counter, the shared sparkline and the alphabetical Regulatory Pulse.
- `/api/dashboard/summary` (and `summary.json`) now return `collected`, `government`,
  `page_changes` and `others`; `high_impact`, `new_incidents` and the source counts are
  gone. `/api/items` takes `tier` (e.g. `1` or `3,4`).

### Changed (2026-11-25, T-044)
- **Watch Board foundation** (DEC-033, DESIGN_SYSTEM.md): new colour values under the
  same token names, IBM Plex Sans and Mono in place of Inter and JetBrains Mono, flat
  surfaces with 6px and 4px corners, no shadows or glow. New primitives: Panel, Tile,
  Chip, day count, stage track, code tile, square flag, row.
- The side rail is gone. A notice banner shows at every width (the not-legal-advice
  footer was hidden on phones), then a top bar with tabs and search (`/` focuses it)
  and a status strip: data time in UTC, refresh interval, sources OK, when records were
  last checked and when the next check is due. Phones get a five-tab bar that now
  includes Standards. Feed rows lose the impact ring and confidence dots.
- A first About page (completed in T-047).

### Fixed (2026-11-25, T-042)
- Titles and excerpts showed raw HTML entities ("&amp;"). Text is decoded at
  collection, and a one-time repair fixes rows already stored (DEC-034).
- Reports of one incident filled the incident list (ten rows for one outage). The AI
  Incident Database files each report under an incident number, given in the citation
  link that ends each description; reports sharing it now show as one row with a
  report count, and the drawer lists them.
- "Last update" on the laws table fell back to the introduction date; it is now the
  date of the newest timeline event.
- The site had no description, canonical link or share-preview tags. A pasted link now
  shows a title, description and image.

### Added (2026-11-25)
- Curated **milestones** on four laws (EU AI Act, Colorado SB 26-189, California SB 53,
  Utah AI Policy Act) and `superseded_by` on Colorado SB 24-205, with shape checks in
  `backend/tests/test_seed_data.py`. Stored in two new tables (`regulation_milestones`,
  `regulation_successions`), mirrored by the seeder, and returned by the API and the
  static export as `regulation.milestones` (date order) and `regulation.superseded_by`
  (T-043). An existing database gains the tables on its next `seed`.

### Changed (2026-11-25)
- **Public site moves to Cloudflare at aigov.mattguenther.com** (DEC-032): assets-only
  Worker deployed by `wrangler deploy` from publish.yml, replacing GitHub Pages. Deep
  links return 200; `frontend/public/_headers` adds a strict CSP and security headers.
  The 404.html and page-shell copies are gone.
- Wording: "human-verified" became "checked against official sources" (README, detail
  tooltip, incidents page), matching how records are actually checked.
- **Curated records verified** against primary sources (T-038,
  docs/reviews/2026-11-25-records-verification.md). Nine material corrections, including
  Colorado SB 24-205 → SB 26-189 (new record), EU AI Act dates moved by Reg. (EU)
  2026/1744, Brazil not enacted, NYC LL 144 enacted without signature, Utah's 2025
  rewrite, and Texas's government-only bans. Every regulation now shows
  `last_verified_at` 2026-11-25.
- Re-seeding mirrors the curated files: corrected event dates and summaries replace the
  old rows, events no longer in the file are removed (evidence-linked ingestion events
  are kept), and a renamed incident replaces the old one. Duplicate event keys or
  incident titles fail the seed.
- Regulation confidence ages with its verification (DEC-031): lowered one level when
  the effective date or compliance deadline passed after the last check, and one more
  when the check is over 90 days old. `curated_confidence` and `confidence_notes`
  added to the regulation API; the reasons show on the badge and the detail page.
- Sources: NIST News and the Federal Register keep only AI-related items (about 1 in
  5 and 1 in 4 of what they publish); the Federal Register fetches 100 documents per
  poll to compensate. The Register — AI/ML disabled (little governance signal).
- AI-relevance keywords: bare "biometric" no longer counts (it matched a DHS visa
  fee rule that then ranked as the top "high impact" item); biometric
  identification, categorisation, recognition and surveillance still do.

### Added
- **Public read-only site** (DEC-029): `radar export-static --out DIR` writes the
  JSON snapshot; `npm run build:static` builds the SPA in static mode (to
  `frontend/dist-static/`); `.github/workflows/publish.yml` collects, saves the
  database to the `radar-data` branch, builds, and deploys to GitHub Pages every 6
  hours. The static data layer (`frontend/src/lib/staticData.ts`) mirrors the API's
  filters, sorting, and search. Static mode shows a read-only Source Health page and a
  "Data updated …" stamp, and hides all write actions.
- `radar backup PATH`: consistent single-file database copy (`VACUUM INTO`); never
  overwrites.
- `radar ingest --tolerate-source-errors`: exit 0 when individual feeds fail
  (failures are still recorded); unexpected errors still exit non-zero.
- All Sources: removable "Since …" date chip and an "Include page-change alerts"
  toggle (`since` / `include_page_changes` query params, also on `GET /api/items`).

### Changed
- Dashboard (DEC-030): windows use publication date, not collection time; KPIs count
  distinct developments and link to lists with identical filters; Top Developments
  covers the last 30 days and excludes page-change alerts and demo data (demo is a
  first-run fallback only).
- `tx-muted` `#5C6B80` → `#7A8BA3`: timestamps and meta text now meet WCAG AA
  (≥ 4.6:1 on every surface; was 2.9–3.6:1).

### Fixed
- Timestamps are parsed as UTC. The API sends offset-less UTC and browsers read it
  as local time, which skewed every relative time by the viewer's UTC offset (US
  viewers saw "just now" for items hours old). Calendar dates render in UTC so they
  never shift a day.
- mypy errors in `api/items.py` reported by current mypy.

### Tests
- 2026-11-25: backend 69 → 76 (confidence aging, AI-relevance precision, seeder sync,
  Colorado successor record).
- Backend 66 → 69 (window/page-change semantics, static export without demo data,
  backup); frontend 11 → 16 (timestamp parsing across timezones).

## [0.1.0] — 2026-08-11 — V1 implementation

### Added
- **Backend** (Python 3.12 / FastAPI / SQLite WAL + FTS5): 12-table schema, static
  jurisdictions module, SafeFetcher (SSRF, DNS-rebinding, redirect re-validation,
  size caps, rate limits), ingestion pipeline (RSS/Atom, JSON API, page_watch hash
  monitoring), deterministic classification, transparent impact/confidence scoring,
  conservative dedup clustering, change detection with entity events, deterministic
  Morning Brief + dashboard summary, watchlist delta derivation, full REST API with
  OpenAPI docs, `radar` CLI (serve/ingest/seed/status/reindex), optional asyncio
  scheduler.
- **Curated seed data**: 7 regulations (Colorado AI Act, EU AI Act, NYC LL144, Utah,
  CA SB 53, TX TRAIGA, IL HB 3773) with lifecycle events + verification timestamps;
  7 standards/frameworks (NIST AI RMF + GenAI Profile, ISO 42001/23894, OWASP LLM
  Top 10 + Agentic, MITRE ATLAS, Singapore MGF); 7 documented public incidents with
  fact-status labels and evidence links; flagged demo items.
- **Verified live sources** (2026-08-11): NIST News RSS, Federal Register API, GOV.UK
  Atom, arXiv API, page-watch on NIST AI RMF / EUR-Lex / MITRE ATLAS / OWASP GenAI /
  Stanford HAI. CISA + ISO ship disabled (403 for honest non-browser User-Agent).
- **Frontend** (React / TS / Vite / Tailwind, hand-rolled design system): Dashboard
  (KPIs, Top Developments, d3-geo choropleth, incidents, standards watch), Morning
  Brief, Regulatory Radar (table/timeline), Standards, Incidents + report-style
  detail, Intelligence Feed, Watchlist, entity details with timelines, grouped
  search, Settings (source health, add-source, import/export, ingest-now), item
  intelligence drawer with impact-factor breakdown, mobile bottom nav, full
  empty/error/loading states, explicit 404.
- **Release engineering**: single Docker image + compose, GitHub Actions CI
  (backend, frontend, docker smoke), README/CONTRIBUTING/SECURITY/CODE_OF_CONDUCT.
- **Tests**: 60 backend (offline fixtures, SSRF suite, pipeline scenarios, API
  contracts) + 11 frontend; ruff/mypy/eslint/tsc clean.

### QA
- Independent fresh-context QA evaluation (docs/reviews/V1-QA.md): no P0/P1;
  six P2/P3 findings, five fixed same-day (SSRF creation-time hardening, data
  repopulation, 404 page, category hydration, source deletion), one accepted
  (clustering covered by tests).

## [Unreleased]

### 2026-08-11 — Morning Brief and Watchlist removed; feed renamed (DEC-028)
The brief was a strict subset of the dashboard (same high-impact items, fewer
modules), and the watchlist is a scale feature that adds nothing while the whole
corpus fits on one screen. Removed both, along with the "since your last visit"
machinery they shared (`/api/visit`, `last_visit_at`, mark-viewed), the `watches`
table, `changes.py`, watch buttons across Regulatory/Standards/Entity views, the
sidebar badge, watch entries in import/export, and the `watched_match` scoring
factor. `services/brief.py` became `services/summary.py` with only the dashboard
aggregation left.

"Intelligence Feed" renamed **All Sources** (nav, page, and dashboard strip) — it is
the searchable firehose, not the headline surface, and the name now says so.

Six surfaces remain, each with a distinct job: Home, Regulatory Radar, Standards,
Incidents & Risks, All Sources, Settings.

### 2026-08-11 — Events & Training removed (DEC-027)
Owner decision after evaluating a working implementation: no source publishes AI
governance events or certifications with enough relevance to justify the feature.
Removed the page and route, the `sitemap_events` source type and schema.org Event
parser, the Relve and NIST Events sources (28 collected items deleted), the
`event`/`training` classification rules, and their filter options. The dashboard's
fourth KPI is now **Sources reporting** (healthy/enabled, links to Settings) — always
backed by real data, and it tells you whether the other three numbers can be trusted.
Category values stay in the data model in case a dedicated source ever appears.

### 2026-08-11 — Data quality, recency, and classifier honesty
**Sources (6 added, all live-verified).** AI Incident Database RSS (real, current
incident reports — the primary fix for years-old incident data), European Commission
Digital Strategy (Tier 1 EU), The Register AI/ML, MIT Technology Review AI,
TechCrunch AI, NIST Events. See SOURCE_CATALOG.md for what was rejected and why.

**Classifier precision.** Added an AI-relevance gate: items with no AI-specific
subject matter are capped at impact 25 (recorded as a visible negative factor), and
broad feeds (GOV.UK, TechCrunch, EU, NIST Events) drop them at ingestion. Fixed three
mislabelling bugs: "Federal **Register**" read as an event, "AI **training**" (model
training) read as professional development, and defensive research ("**Breach**-Aware
…") read as an incident. `training` is no longer inferred from prose at all — only
from a source declared to publish it. New `radar rescore [--prune-irrelevant]`
command re-applies rules to stored items; 18 off-topic items pruned.

**Recency over criticality.** Items API now defaults to newest-first; incidents API
gained `sort=newest|severity` (newest default). Intelligence Feed and Incidents pages
have sort controls. Dashboard now shows *recent incident reports* rather than curated
records from years ago; the KPI counts reported incidents too.

**Map semantics.** It was counting only `regulations`, so jurisdictions tracked via a
framework (Singapore) were invisible; and EU activity was copied onto member states
whose click-through landed empty. Now counts all governance instruments, labels
itself a **coverage map** (not a ranking of national regulation), and EU-covered
states link to the EU record. Also capped in width so it no longer dominates
large displays.

**Classifier definitions.** Every impact band, confidence level, severity, fact
status, and source tier now states its meaning on hover (`lib/definitions.ts`), with
a "What do these ratings mean?" explainer on Incidents.

**Other.** LIVE indicators use a pulsing red dot with neutral text (broadcast
convention). New Events & Training page — the Opportunities KPI no longer dumps users
into a filtered feed — with an explicit note about its coverage limits.

### 2026-08-11 — V2 design shipped: "Refined Intelligence Dashboard" (DEC-025)
- Production UI migrated to the owner-approved Direction A rev 2 after a three-way
  prototype comparison: refreshed tokens (navy surfaces, gradient cards, accent
  radial wash), animated radar brand mark (blue structure / green sweep + blips),
  real flag chips (flag-icons + us-state-flags), org monogram avatars, incident
  category icons, impact rings + confidence dots in rows, filled status pills,
  tinted KPI cards with sparklines, glowing world-map activity markers with legend,
  Regulatory Pulse module + live feed strip on the dashboard, refined sidebar/nav.
- Regulation "effective/enforcement" pill tone: red → green (in force = healthy).
- Design playground and serif package removed; DESIGN_SYSTEM.md rewritten as the
  shipped system; Ink & Signal doc marked superseded.
- Gates: tsc, eslint, 11 vitest, production build all green; desktop + mobile
  browser-verified.

### 2026-08-11 — V2 design research & direction (no implementation)
- Researched reference interfaces (Bloomberg Terminal, FT/Origami, The Economist,
  Our World in Data, Palantir Blueprint, SOC consoles) and critiqued the running V1
  UI route-by-route in the browser.
- Proposed the "Ink & Signal" visual direction in docs/design/V2-DESIGN-DIRECTION.md:
  warm-ink palette, amber identity accent, domain-coded module language (preserving
  the widget dashboard), serif/mono/sans typography, flat mono status tokens, impact
  meters, terminal status strip, map restyle. Awaiting approval; DESIGN_SYSTEM.md V1
  rules remain authoritative.

### 2026-08-11 — Skeptical architecture review (same day, second pass)
- Recorded DEC-016…022 simplifications: asyncio loop replaces APScheduler; single
  process serves API + built SPA (one Docker image, compose optional not canonical);
  SQLite-only V1 (dropped untested Postgres promise + SearchService abstraction);
  data model trimmed 15 → 12 tables (tags/item_tags cut, jurisdictions now a static
  module); no structured HTML scrapers (feeds/APIs + page_watch hash monitoring);
  Alembic deferred to V1 schema freeze; map via d3-geo + topojson-client with
  vendored Natural Earth data.
- Synced ARCHITECTURE.md (rewritten), DATA_MODEL.md, TASKS.md (T-002, T-008, T-009,
  T-010, T-017, T-018, T-021, T-030), CLAUDE.md, .env.example accordingly.

### 2026-08-11 — Project initialization (planning session)
- Normalized the original 93-section spec into tracked `PRODUCT_SPEC.md`; scope
  clarifications recorded as DEC-010/011/013.
- Established architecture (ARCHITECTURE.md) and 15 decision records (DECISIONS.md):
  FastAPI + SQLite/Alembic backend, Vite React SPA, SVG choropleth, no-LLM V1,
  curated regulatory records, single-user local-first.
- Wrote DATA_MODEL.md (15 V1 tables + integrity rules), DESIGN_SYSTEM.md (dark
  intelligence-terminal tokens/components), TEST_PLAN.md (offline-only test layers +
  release gate), SOURCE_CATALOG.md (unverified seed candidates).
- Created V1 backlog: TASKS.md T-001…T-032, all TODO.
- Added CLAUDE.md, AGENT_HANDOFF.md, README.md stub, .gitignore, .env.example.
- No application code yet — implementation blocked on owner plan approval.
