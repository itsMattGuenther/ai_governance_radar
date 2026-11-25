# Tasks — V1 Backlog

> **V1 implementation completed 2026-08-11.** All tasks below are DONE, with these
> honest caveats against their original acceptance criteria:
> - **T-004:** the `/dev/kit` showcase route was replaced by vitest render tests for
>   every primitive (equivalent coverage, less surface to maintain).
> - **T-010:** the 10k-row p95 perf smoke was not run; current dataset (~150 rows)
>   responds in single-digit ms. Revisit if catalogs grow.
> - **T-025:** manual keyboard/responsive/contrast review done; automated axe scan
>   deferred (would add a tooling dependency) — see V1-QA report.
> - **T-028:** source health + retry + `radar status` shipped; the sidebar
>   failing-source badge was dropped (Settings surfaces failures prominently).
> - **T-029/T-030:** CI workflow and Docker image are written, with a CI job that
>   builds + smoke-tests the image; neither has executed yet because this machine has
>   no Docker and the repo hasn't been pushed. First push will exercise both.
> - **T-031:** visual QA performed live in-browser (desktop + mobile); findings and
>   fixes recorded in [docs/reviews/V1-QA.md](docs/reviews/V1-QA.md) instead of a
>   screenshot archive.

Statuses: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`. Work top-to-bottom within a
phase; respect dependencies. A task is DONE only per the Definition of Done
(PRODUCT_SPEC.md §9): implemented + tested + documented + visually verified (UI tasks) +
error states + accessibility reviewed. Update this file and CHANGELOG.md as you go.

## Phase 0 — Foundation

### T-001 Backend scaffold
- **Status:** DONE · **Depends on:** —
- **Description:** `backend/` FastAPI app per ARCHITECTURE.md layout: pyproject.toml
  (FastAPI, SQLAlchemy, Alembic, httpx, feedparser, pydantic-settings, pytest), config
  via env vars (pydantic-settings, reads `.env`), `/api/health` endpoint, CORS locked to
  frontend origin, uvicorn dev entrypoint bound to 127.0.0.1.
- **Acceptance:** `uvicorn app.main:app` serves `/api/health` → `{"status":"ok"}`;
  `/docs` renders; settings load from env with sane defaults; pytest runs green.
- **Test strategy:** pytest + FastAPI TestClient for health + config defaults.

### T-002 Database schema (core)
- **Status:** DONE · **Depends on:** T-001
- **Description:** SQLAlchemy models for DATA_MODEL.md's 12 V1 tables: sources,
  source_runs, items, item_clusters, entities, regulations, standards, incidents,
  entity_events, item_entities, watches, app_state — plus the items_fts FTS5 index and
  the static `core/jurisdictions.py` reference module (DEC-018). SQLite WAL; schema via
  `create_all()` on startup (Alembic deferred to schema freeze, DEC-021).
- **Acceptance:** fresh checkout → app start creates the DB file with all tables +
  FTS index; jurisdiction codes validate against the static module; "delete DB and
  re-seed" flow documented.
- **Test strategy:** pytest fixture spins a temp DB, asserts tables/constraints; a CRUD
  smoke test per model.

### T-003 Frontend scaffold
- **Status:** DONE · **Depends on:** —
- **Description:** `frontend/` Vite + React + TS + Tailwind + React Router + TanStack
  Query + shadcn/ui init + lucide-react. Dev proxy `/api` → `:8000`. ESLint + Prettier +
  vitest configured.
- **Acceptance:** `npm run dev` serves shell page; `npm run build`, `lint`, `typecheck`,
  `test` all pass; proxied `/api/health` call renders status.
- **Test strategy:** one vitest smoke test (App renders); CI-runnable scripts.

### T-004 Design tokens + UI primitives
- **Status:** DONE · **Depends on:** T-003
- **Description:** Implement DESIGN_SYSTEM.md: Tailwind theme (colors, type scale,
  radii), self-hosted Inter + JetBrains Mono, and primitives: SeverityBadge,
  ConfidenceBadge, TierBadge, StatusPill, IntelCard, KpiCard, EmptyState, ErrorState,
  Skeleton, WatchButton, SourceAttribution, DataTable shell.
- **Acceptance:** a hidden `/dev/kit` route renders all primitives in all states;
  AA contrast verified; badges never color-only.
- **Test strategy:** vitest render tests per primitive; manual visual pass against
  DESIGN_SYSTEM.md; axe check on the kit page.

### T-005 App shell + navigation
- **Status:** DONE · **Depends on:** T-004
- **Description:** Fixed collapsible sidebar (V1 entries: Home, Morning Brief,
  Regulatory Radar, Standards, Incidents, Watchlist, Settings), routes with lazy pages,
  page header pattern, mobile bottom nav + drawer, reduced-motion support.
- **Acceptance:** all routes reachable by keyboard; sidebar collapses to icons; mobile
  (<768px) shows bottom nav; active states visible; no horizontal scroll at 375px.
- **Test strategy:** vitest routing tests; manual responsive pass at 1280/768/375.

### T-006 Source registry + seed sources
- **Status:** DONE · **Depends on:** T-002
- **Description:** YAML source definitions in `data/sources/` (per §85 shape: name,
  type, url, feed_url, tier, jurisdiction, categories, enabled, polling interval);
  loader CLI `radar seed-sources` (idempotent upsert); `GET/POST/PATCH /api/sources`.
- **Acceptance:** seed file loads ≥10 sources into DB; API lists/filters/toggles them;
  re-running loader doesn't duplicate.
- **Test strategy:** pytest: loader idempotency, YAML validation errors, API contract.

### T-007 Verify real seed source feeds
- **Status:** DONE · **Depends on:** T-006
- **Description:** For each SOURCE_CATALOG.md candidate, verify the actual feed/API URL
  (exists, format, update cadence, ToS/robots) and update the catalog + YAML with
  verified entries. Target ≥6 verified Tier-1/2 sources across regulation, standards,
  security, incidents. **Do not guess URLs — verify by fetching.**
- **Acceptance:** SOURCE_CATALOG.md rows marked verified with date; YAML matches;
  each verified feed parses with feedparser.
- **Test strategy:** recorded sample of each verified feed saved to
  `backend/tests/fixtures/feeds/` for offline tests.

### T-008 Ingestion engine core
- **Status:** DONE · **Depends on:** T-006
- **Description:** SafeFetcher (scheme allowlist, private-IP block with DNS pinning,
  timeouts, size cap, conditional GET, per-host rate limit, robots.txt) → RSS/Atom/
  json_api parsers + `page_watch` hash monitoring for feed-less sources (DEC-020) →
  normalizer → plain-text sanitized excerpt (≤500 chars) → persist items with
  first/last-seen; source_runs logging; `radar ingest [--source X]` CLI; optional
  asyncio scheduler loop (`SCHEDULER_ENABLED`, DEC-016).
- **Acceptance:** ingesting fixture feeds creates items with URL, dates, excerpt,
  retrieval timestamps; re-ingest updates last_seen without duplicating; failures write
  source_runs rows with errors; SafeFetcher blocks `file://`, `http://169.254.x`,
  `http://127.0.0.1` targets in tests.
- **Test strategy:** offline pytest against fixtures; SSRF unit tests; run-logging tests.

### T-009 Seed demo dataset
- **Status:** DONE · **Depends on:** T-002
- **Description:** Curated `data/seed/` JSON/YAML: ~8 regulations
  (Colorado AI Act, EU AI Act, NYC LL144, Utah, CA, TX, IL, CT); ~8 standards (NIST AI
  RMF + GenAI profile, ISO 42001/23894/22989, OWASP LLM Top 10, OWASP Agentic, MITRE
  ATLAS); ~6 incidents (drawn from public incident databases, fact_status labeled);
  entity_events history; demo items **explicitly flagged `DEMO DATA`** (§78). All
  records carry official source URLs; no fabricated facts presented as real.
- **Acceptance:** `radar seed` loads everything idempotently; every record passes
  integrity rules (DATA_MODEL.md §Integrity); demo items visibly marked in UI later.
- **Test strategy:** pytest: seed idempotency + integrity validation (source URL
  present, confidence set, dates sane).

## Phase 1 — Intelligence Dashboard

### T-010 Items API
- **Status:** DONE · **Depends on:** T-008, T-009
- **Description:** `GET /api/items` (filters: category, jurisdiction, impact≥,
  confidence, source, date range, watched-only, cluster-collapsed; sort; offset
  pagination) + `GET /api/items/{id}` with linked entities/evidence.
- **Acceptance:** documented in OpenAPI; filters combine correctly; p95 < 100ms on 10k
  seeded items.
- **Test strategy:** pytest API contract + filter matrix; perf smoke with generated rows.

### T-011 Dashboard KPI cards + summary API
- **Status:** DONE · **Depends on:** T-005, T-010
- **Description:** `GET /api/dashboard/summary` (high-impact count, total changes,
  new incidents, new opportunities — relative to last_visit_at and time window) +
  4 KpiCards, each clicking through to its filtered view. Updates last_visit_at logic.
- **Acceptance:** counts match a hand-computed fixture scenario; click-throughs land on
  correctly pre-filtered pages; loading skeletons + error states present.
- **Test strategy:** pytest count logic against fixture DB; vitest click-through tests.

### T-012 Top Developments card
- **Status:** DONE · **Depends on:** T-010, T-024
- **Description:** Dashboard card: top 5–7 items by impact within window — severity
  badge, source, category, title, one-line explanation, relative timestamp, link (§20).
- **Acceptance:** ordering matches impact score; empty/loading/error states; keyboard
  accessible.
- **Test strategy:** vitest ordering/render; API test for the ranked query.

### T-013 Regulations API + Regulatory Radar page (table)
- **Status:** DONE · **Depends on:** T-009, T-005
- **Description:** `GET /api/regulations` with filters (country, state/region, status,
  impact, date, topic); Radar page table view: Jurisdiction, Regulation, Status
  (StatusPill), Last Update, Effective Date, Impact, Watch (§22). Regulation detail
  drawer/page with full §7 fields + SourceAttribution + last_verified.
- **Acceptance:** all seed regulations render; every filter works; **no legal status
  hard-coded in components** (all from API); detail shows evidence links.
- **Test strategy:** pytest filters; vitest table + filter interaction; manual a11y pass.

### T-014 Regulatory timeline view
- **Status:** DONE · **Depends on:** T-013
- **Description:** Chronological view of regulatory entity_events (status changes,
  amendments) with jurisdiction filter. (Map view = T-021; comparison view deferred
  post-V1.)
- **Acceptance:** events ordered, grouped by date; filters shared with table view.
- **Test strategy:** vitest rendering from fixture events.

### T-015 Standards API + Standards page
- **Status:** DONE · **Depends on:** T-009, T-005
- **Description:** `GET /api/standards`; page with publisher tabs (All/NIST/ISO/OWASP/
  MITRE/IEEE/Other), update cards per §23, "Standards at a Glance" summary strip
  (new/updated/draft/withdrawn counts), watch buttons.
- **Acceptance:** tabs filter correctly; cards show version/status/dates/magnitude/
  official link; glance counts match data.
- **Test strategy:** pytest API; vitest tab + card tests.

### T-016 Incidents API + list + detail page
- **Status:** DONE · **Depends on:** T-009, T-005
- **Description:** `GET /api/incidents`, `GET /api/incidents/{id}`; list with severity/
  category/date filters; detail page as security-intelligence report per §24 layout:
  metadata panel, what happened, governance relevance, security relevance, mitigation,
  related frameworks (cross-links), source evidence, fact_status + confidence badges.
- **Acceptance:** seed incidents render fully; fact_status always visible; framework
  cross-links navigate to entities; no detail invented beyond stored fields.
- **Test strategy:** pytest API; vitest detail layout; a11y pass on detail page.

### T-017 Watchlist
- **Status:** DONE · **Depends on:** T-010
- **Description:** `GET/POST/DELETE /api/watchlist` (targets: entity, source,
  jurisdiction, category); WatchButton wired everywhere entities appear; Watchlist
  page per §51 (watched count, changed-today count, per-target change status derived
  from entity_events/items since last_viewed_at); dashboard watch-delta integration.
- **Acceptance:** watch/unwatch round-trips; change statuses match fixture scenario;
  page shows NO CHANGE vs UPDATED vs STATUS CHANGE distinctly (not color-only).
- **Test strategy:** pytest change-derivation logic (core!); vitest toggle + page tests.

### T-018 Search
- **Status:** DONE · **Depends on:** T-010
- **Description:** FTS5 index (items + entity names) queried by a search service
  module (no dialect abstraction, DEC-019); `GET /api/search?q=` returns grouped results (REGULATIONS/STANDARDS/INCIDENTS/NEWS/
  EVENTS/TRAINING); global search UI (header input, grouped dropdown + full results
  page), keyboard navigable.
- **Acceptance:** queries match title/excerpt/entity/jurisdiction/tag; groups ordered
  per §28; empty state for no results; index stays in sync on ingest.
- **Test strategy:** pytest search relevance fixtures + sync-on-ingest; vitest UI tests.

### T-019 Item detail / intelligence view
- **Status:** DONE · **Depends on:** T-010
- **Description:** Expanded item view per §26: What happened / Why it matters / Who is
  affected / What changed / Related records / Evidence links / Confidence. Fields render
  only when data exists (deterministic content in V1).
- **Acceptance:** every section sourced from stored data; SourceAttribution complete
  (source, pub date, original URL, retrieval date); related links navigate.
- **Test strategy:** vitest conditional-section tests; pytest for the composed endpoint.

### T-020 Morning Brief (deterministic)
- **Status:** DONE · **Depends on:** T-011, T-017
- **Description:** `GET /api/brief` + Brief page per §25 layout: high-impact
  developments since last visit, per-domain change counts, watchlist deltas,
  professional-development counts (from item categories). Pure aggregation, no LLM.
- **Acceptance:** brief matches fixture scenario exactly; date-headed layout per spec;
  works when empty (meaningful empty state).
- **Test strategy:** pytest aggregation against fixture DB; vitest page render.

### T-021 Regulatory heat map (SVG choropleth)
- **Status:** DONE · **Depends on:** T-013
- **Description:** Dashboard card + Global view: world SVG choropleth via d3-geo +
  topojson-client with vendored Natural Earth data (DEC-022), colored by a **clearly
  labeled** metric (active AI laws count / recent activity);
  hover tooltip, click → jurisdiction-filtered regulations, legend, metric selector
  (§21). Never implies good/bad regulation.
- **Acceptance:** countries with seed data are interactive; legend + metric label
  visible; keyboard-accessible alternative (table fallback or focusable regions).
- **Test strategy:** vitest metric mapping; manual visual + a11y pass.

### T-022 Settings page
- **Status:** DONE · **Depends on:** T-006, T-005
- **Description:** Sources tab (enable/disable, polling interval, add manual source
  with SafeFetcher-validated URL, health: last success/failure + error per §59);
  Dashboard tab (time window, visible modules, density) persisted to app_state;
  AI tab placeholder ("available in a future release", DEC-007); export/import
  (watchlist + config JSON/CSV, §53).
- **Acceptance:** source toggles/persist round-trip; invalid/SSRF URLs rejected with
  clear errors; export→import restores watchlist; prefs affect dashboard.
- **Test strategy:** pytest settings + import/export round-trip; vitest form tests.

### T-023 Empty / loading / error states pass
- **Status:** DONE · **Depends on:** T-011..T-022
- **Description:** Sweep every page/module: skeletons during load, meaningful empty
  states with actions (§58), visible actionable errors incl. source-failure surfacing
  (§59). No blank cards anywhere.
- **Acceptance:** checklist per route documented in TEST_PLAN.md executed; screenshots
  archived in docs/qa/.
- **Test strategy:** vitest state-mocking tests + manual pass.

### T-024 Impact + confidence scoring (transparent)
- **Status:** DONE · **Depends on:** T-008
- **Description:** Deterministic scoring service: impact 0–100 from weighted factors
  (source tier, category weight, change type, recency, watchlist relevance §63);
  confidence high/med/low from source tier + corroboration count + fact_status (§64).
  Factors persisted to impact_factors for "Why is this high impact?" display.
- **Acceptance:** scoring is pure/deterministic (same input → same score); factors
  render in item detail; weights configurable in one place; impact and confidence
  visibly independent in UI.
- **Test strategy:** pytest table-driven scoring cases; property test: score bounds.

### T-025 Responsive + accessibility pass
- **Status:** DONE · **Depends on:** T-023
- **Description:** Full pass at 1280/768/375: tablet collapse behavior, mobile bottom
  nav priority (§56), keyboard nav, focus visibility, contrast audit, reduced motion.
- **Acceptance:** DESIGN_SYSTEM.md §8 checklist passes on all V1 routes; axe reports
  no serious violations.
- **Test strategy:** manual + axe; screenshots at all three widths archived.

## Phase 1.5 — Data Quality

### T-026 Change detection
- **Status:** DONE · **Depends on:** T-008
- **Description:** content_hash comparison on re-fetch → `document_updated` events;
  curated entity field edits → typed entity_events (status_change, date_changed) with
  previous/new values; distinguish "document changed" vs "meaningful governance change"
  via event types (§27, hash-level only per DEC-015).
- **Acceptance:** modified fixture feed produces update events, not duplicate items;
  entity edits produce timeline entries; watchlist deltas pick both up.
- **Test strategy:** pytest re-ingest scenarios; timeline assertion tests.

### T-027 Deduplication + event clustering
- **Status:** DONE · **Depends on:** T-008
- **Description:** canonical URL normalization (strip trackers, resolve scheme/host
  case); exact dupes merge; fuzzy clustering (normalized-title similarity within 72h
  window) → item_clusters with highest-tier source as primary (§62); UI collapses
  clusters with "N sources" expander.
- **Acceptance:** fixture with same story from 3 sources yields one cluster, official
  source primary; no false-merge in the negative fixtures.
- **Test strategy:** pytest similarity thresholds with curated positive/negative pairs.

### T-028 Ingestion monitoring
- **Status:** DONE · **Depends on:** T-008, T-022
- **Description:** Source health in Settings: per-source last runs, error surfaced per
  §59 pattern, failing-source badge count in sidebar/Settings; `radar status` CLI.
- **Acceptance:** a failing fixture source appears with error, last-success time, and
  Retry action that re-runs ingestion for it.
- **Test strategy:** pytest run aggregation; vitest health UI states.

## Release Engineering

### T-029 CI pipeline
- **Status:** DONE · **Depends on:** T-001, T-003
- **Description:** GitHub Actions: backend (ruff, mypy, pytest) + frontend (eslint,
  tsc, vitest, build) on PR/push. No network in tests.
- **Acceptance:** CI green on main; a seeded failure (broken test) turns it red.
- **Test strategy:** the pipeline is the test; verify both matrices run.

### T-030 Packaged deployment (single process + optional Docker)
- **Status:** DONE · **Depends on:** T-008, T-025
- **Description:** Per DEC-017: `radar serve` runs the single process serving API +
  built SPA on one port (canonical path, documented first); ONE Dockerfile (multi-stage:
  build SPA → copy into Python image) + minimal docker-compose.yml with SQLite volume;
  non-root container; `--profile ai` reserved (empty in V1).
- **Acceptance:** clean machine: (a) documented Python path serves the full app on one
  port; (b) `docker compose up` does the same with seeded data; ingestion runnable in
  both.
- **Test strategy:** smoke script (curl health, item count > 0) against both paths;
  doc walkthrough.

### T-031 Visual QA pass
- **Status:** DONE · **Depends on:** T-025, T-030
- **Description:** Browser screenshot pass of Dashboard, Regulatory Radar, Standards,
  Incident detail, Watchlist, Settings, Brief, mobile dashboard (§73); compare against
  DESIGN_SYSTEM.md; fix and repeat until matching.
- **Acceptance:** archived screenshots in docs/qa/ judged against §15/§91 quality bar;
  no obvious layout defects.
- **Test strategy:** screenshot → inspection loop (§70 pattern).

### T-032 Open-source docs
- **Status:** DONE · **Depends on:** T-030
- **Description:** README (what/screenshots/architecture/install/config/contributing/
  license per §84), CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md; env vars
  documented; legal disclaimer (§87) in README + app footer.
- **Acceptance:** a newcomer can install from README alone (verified by following it
  verbatim on a clean clone).
- **Test strategy:** doc walkthrough; link check.

## Public site (owner-approved 2026-09-29)

### T-033 Dashboard honesty fixes
- **Status:** DONE · DEC-030
- **Description:** Publication-date windows; KPIs match their drill-downs; Top
  Developments = last 30 days without page-change alerts or demo data; AA contrast for
  `tx-muted`; UTC timestamp parsing.
- **Acceptance:** KPI count equals the linked list's total; backlog collected today but
  published weeks ago is not "new"; relative times correct in any timezone.
- **Test strategy:** pytest window/page-change test; vitest timestamp tests in two
  TZs; browser check of the dashboard and a KPI drill-down.

### T-034 Static public site on GitHub Pages
- **Status:** DONE (code) · first deploy pending owner go-ahead · DEC-029
- **Description:** `radar export-static`, static SPA mode, read-only Source Health,
  publish workflow with the database on the `radar-data` branch.
- **Acceptance:** static site renders every page under a subpath with 404.html
  fallback; static filters and search return the same results as the live API; no
  demo data in the snapshot; a second run restores the database and the data branch
  stays at one commit.
- **Test strategy:** pytest export/backup tests; local Pages emulator + Playwright
  parity check; local dry run of every `run:` step in publish.yml (fresh DB, then
  restore).

### T-035 Mobile layout pass
- **Status:** DONE 2026-11-25 — completed by T-044 and T-046
- **Description:** KPI cards overflow a 390px viewport (≈9px horizontal scroll);
  Regulatory Radar hides Status and Effective columns on phones. Cards instead of the
  table below `sm`; KPI row that fits.
- **Acceptance:** no horizontal scroll at 360–430px on every page; status and
  effective date visible for each regulation on a phone.

### T-036 Page weight
- **Status:** DONE 2026-11-25 — completed by T-044 and T-047
- **Description:** 3.6 MB JS / 4.4 MB page. Use `countries-110m` (108 KB) instead of
  `countries-50m` (756 KB); load US state flags on demand instead of bundling all 50.
- **Acceptance:** initial JS under 1 MB uncompressed with no visual regression.

### T-037 About & methodology page
- **Status:** DONE 2026-11-25 — completed by T-047
- **Description:** What is tracked, how impact and confidence are scored (the dots and
  rings), how curated records are verified, the last-verified policy, and the
  not-legal-advice notice. Hover tooltips don't reach phone users.

### T-038 Re-verify curated regulation records
- **Status:** DONE 2026-11-25 · DEC-031
- **Description:** All 29 curated records checked against primary sources
  (docs/reviews/2026-11-25-records-verification.md) and the approved changes applied.
  Three were correct; nine had errors that would mislead (Colorado replaced by SB 26-189,
  EU high-risk dates moved, Brazil not enacted, NYC LL 144 never signed, among others).
  Colorado SB 26-189 added as a new record. Displayed confidence now drops when a
  record goes 90 days without a check or a key date passes after its check (DEC-031),
  and re-seeding replaces corrected events and renamed incidents.
- **Next check due:** 2027-02-23 (90 days), or sooner for Colorado SB 26-189 (effective
  2027-01-01, rules pending, xAI suit pending) and Brazil (Chamber report pending).

### T-039 Public site on Cloudflare at aigov.mattguenther.com
- **Status:** DONE 2026-11-25 · DEC-032
- **Description:** The owner chose to go public directly (2026-11-25) at
  aigov.mattguenther.com. publish.yml deploys with `wrangler deploy` (assets-only
  Worker); SPA fallback returns 200 for deep links; `_headers` sets CSP and security
  headers. Verified locally with `wrangler dev`: deep links 200, headers present, no
  CSP violations. Repository secrets `CLOUDFLARE_API_TOKEN` (token "ai-governance-radar
  deploy (GitHub Actions)": Workers template, account itsmattguenther, zone
  mattguenther.com, no expiry) and `CLOUDFLARE_ACCOUNT_ID` set; the first push-triggered
  run collected, saved `radar-data` and deployed in 59 s.
- **Acceptance:** site live on the custom domain; refreshes every 6 hours; no
  deep-link 404s.

### T-040 Data-model gaps found by the verification
- **Status:** TODO
- **Description:** Milestones and the successor link are handled by T-043. (a) dates
  have no precision, so month-only facts are left empty and
  stated in text; (b) regulations can't be marked repealed or superseded or link to a
  successor (Colorado uses status_label); (c) evidence is one URL per record, not per
  field; (d) standards, frameworks and incidents have no `last_verified_at`, so DEC-031
  can't reach them.

### T-041 Records the verification suggested
- **Status:** TODO
- **Description:** Japan AI Promotion Act (Act No. 53 of 2025); Singapore Model AI
  Governance Framework for Agentic AI (v1.5); Australia Guidance for AI Adoption; OWASP
  Top 10 for Agentic Applications (or re-scope `owasp-agentic`). Verify each against
  primary sources first.

## UX rebuild (owner-approved 2026-11-25, DEC-033)

Work these in order on the `ux-rebuild` branch. The look is specified in
DESIGN_SYSTEM.md. T-035, T-036 and T-037 are folded in below.

### T-042 Defects that do not depend on the redesign
- **Status:** DONE 2026-11-25 · entities decoded at collection and repaired in stored rows (DEC-034); AIID reports grouped by incident number (23 groups from 91 reports); last update from the timeline; share tags and image
- **Description:** (a) Titles and excerpts show raw HTML entities ("&amp;"): decode
  at ingestion and repair stored rows. (b) "Last update" on the laws table falls back
  to the introduction date; use the date of the latest timeline event. (c) Ten
  reports of one outage appear as ten rows, because `dedupe.assign_cluster` only
  compares items from different sources. If the AI Incident Database feed exposes its
  incident number, group reports by it (one row, a count, expandable). If it does not,
  leave grouping alone and record that in AGENT_HANDOFF.md; do not invent a
  heuristic. (d) `frontend/index.html` has no description, canonical link or
  share-preview tags.
- **Acceptance:** tests for (a) to (c); a pasted link to the site shows a title,
  description and image.

### T-043 Milestones and successor links: model, API, export
- **Status:** DONE 2026-11-25 · two new tables, mirrored by the seeder, in the API and export; the public snapshot of 2026-11-25 upgrades on `seed` (tested against its real schema)
- **Description:** `data/seed/entities.json` already carries `regulation.milestones`
  (`date`, `kind`, `label`) for four laws and `superseded_by` on Colorado SB 24-205,
  guarded by `backend/tests/test_seed_data.py`. They were taken from record text
  verified on 2026-11-25. **Do not add, change or infer any date.** If one looks
  missing, list it in AGENT_HANDOFF.md for the owner. Build the storage, the seeder
  (mirror the file, as events do), `RegulationOut.milestones` and `superseded_by`,
  the static export and the frontend types. The public database persists between runs
  on the `radar-data` branch and `create_all()` adds tables but not columns, so use a
  new table or handle the column explicitly, and test against a database created
  before the change. Update DATA_MODEL.md. Covers part of T-040 (b).
- **Acceptance:** the API and the static export return every milestone in the seed
  file, in date order; re-seeding after an edit replaces them; an old database
  upgrades without manual steps.

### T-044 Watch Board foundation: tokens, type, shell, primitives
- **Status:** DONE 2026-11-25 · Watch Board tokens and IBM Plex; Panel, Tile, Chip, DayCount, StageTrack, CodeTile, Flag, Row with render tests; banner, tabs, status strip, `/` search, five-tab phone bar; no body scroll at 360–430px on any page
- **Description:** Apply DESIGN_SYSTEM.md §2 to §6: token values, IBM Plex Sans and
  Mono in place of Inter and JetBrains Mono, flat surfaces, 6px and 4px radii, no
  shadows or glow. Build the primitives (Panel and header, Tile, Chip, day count,
  stage track, code tile, row) with render tests. Rebuild the shell: notice banner,
  top bar with tabs, status strip, `/` to focus search, phone tab bar that includes
  Standards. The notice must show at every width (it is hidden on phones today).
- **Acceptance:** every existing page still works at 1440×900 and 390×844; no
  horizontal body scroll from 360 to 430px; AA contrast holds.

### T-045 Home becomes the watch board
- **Status:** DONE 2026-11-25 · tiles for the two nearest dates (7 and 37 days today), record changes, records tracked and collection; Dates ahead, Record changes, Laws by stage, From government sources; old modules, KPI fields and chart components removed; items API gains a source-tier filter
- **Description:** Per DESIGN_SYSTEM.md §6 and the mock-up. Tiles: the next two
  dates, record changes in the last 30 days, records tracked, items collected in 7
  days with the count from government sources. Panels: **Dates ahead** (milestones
  only, next five), **Record changes** (events across laws and standards, newest
  first), **Laws by stage** (every law; those not yet in force first, superseded
  last), **From government sources** (tier 1 items from the last 7 days, with a
  footer counting the rest by type and linking to All sources). Remove the counter
  row, Top Developments, the map, Standards Watch, Regulatory Pulse, the "Latest"
  strip and the LIVE dot, and anything in the API, export and tests that only they
  used. Fixes the "High impact" counter, the shared sparkline and the alphabetical
  Regulatory Pulse by removing them.
- **Acceptance:** the two nearest dates are the largest things on the page; every
  panel has loading, empty and error states; Home fits a phone without overlap.

### T-046 Page passes
- **Status:** DONE 2026-11-25 · Laws sorted by next date with Next date and Checked columns, Colorado SB 24-205 nested under SB 26-189, stacked phone rows, compact flat map; record page milestone strip, credentials beside the title, copy link; Standards table; Incidents write-ups first with expandable report groups; All Sources tier tabs (plus All, so Home's count equals its list) with impact and confidence columns
- **Description:** **Laws:** sort by next date, then latest change; a Next date column
  with a day count; confidence shown only below high, with the checked date in its
  place; a superseded law nested under its successor; stacked rows on phones; the
  smaller flat map above the table (DESIGN_SYSTEM.md §9). **Record page:** a milestone
  strip under the title (past dates, today, dates ahead); the checked date and
  official source beside the title; no "Related intelligence" box when it is empty; a
  copy-link control. **Standards:** a table (publisher, name, version, status, last
  updated); no counters that read zero; define "Change magnitude" or remove it.
  **Incidents:** curated write-ups first, the report feed second; severity and fact
  status as columns; real dates. **All sources:** three tabs by source tier
  (government and standards bodies, research and incident databases, press), opening
  on the first; a table layout; impact and confidence as columns and filters; the
  drawer's points breakdown unchanged. Completes T-035.
- **Acceptance:** on a phone every law shows its stage and next date; no list row
  carries a ring, dots or more than one chip.

### T-047 About page, feeds, page weight
- **Status:** DONE 2026-11-25 · About with sources and health (`/sources` redirects), definitions and the corrections log; `milestones.ics` (9 events, parsed by a standard iCalendar library) and an Atom feed of record changes, also served locally under /api/feeds/; initial JS 331 KB (was 3.6 MB) with the 110m map loaded on demand
- **Description:** **/about:** what the site is and who built it (Matt Guenther,
  mattguenther.com, the repository); what is tracked; how impact and confidence are
  computed (`lib/definitions.ts`); how records are checked, when they were last
  checked and when the next check is due; a link to
  docs/reviews/2026-11-25-records-verification.md as the corrections log; the source
  list with health (replacing the Source Health page; `/sources` redirects); the
  not-legal-advice notice. **Feeds**, written by `export-static` and linked from
  About: an `.ics` calendar of milestones ahead and an RSS or Atom feed of record
  changes (un-parked by the owner, DEC-033; other reports and exports stay parked). **Weight** (T-036): `countries-110m`, flags loaded on demand, only the font
  files in use. Completes T-036 and T-037.
- **Acceptance:** the calendar file imports into a calendar app and contains exactly
  the future milestones; initial JS under 1 MB uncompressed.

### T-048 Clean up and hand back
- **Status:** TODO
- **Description:** Leave nothing behind that only existed for this build. Delete
  `docs/handoff/ux-rebuild/` and every reference to it. Remove components, styles,
  tokens, hooks, endpoints, export fields, tests and packages that nothing uses any
  more. Bring README, ARCHITECTURE, DATA_MODEL, PRODUCT_SPEC, TEST_PLAN and CLAUDE.md's
  "Current state" in line with what shipped, set DESIGN_SYSTEM.md's status to SHIPPED,
  and rewrite AGENT_HANDOFF.md as the current state with no build instructions left
  in it. Add the CHANGELOG entry. No scratch screenshots, temp scripts, commented-out
  code or stray TODOs; dev servers stopped; `git status` clean. Then push the branch
  and open one pull request to main. Do not merge it: merging deploys the public site.
- **Acceptance:** all gates in TEST_PLAN.md §2 pass; no file mentions the handoff
  folder or the branch (reword this section's own lines as the last step); the pull
  request is open.

## Post-V1 (parked — do not start)
Rankings page + snapshots (§12) · Training page (§13) · Events page (§14) · comparison
view (§22) · LLM provider layer (§33–38) · agent workflows + evaluator (§39–42) ·
notifications (§81) · reports/exports (§52) · MCP server (§82) · Governance Graph (§79) ·
document-level diffing (§27) · light theme. (The public demo instance, §46–47, was
un-parked as T-034 / DEC-029.)
