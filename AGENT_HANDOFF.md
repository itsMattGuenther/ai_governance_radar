# Agent Handoff

_Last updated: 2026-11-25 (records verified; confidence aging; feeds cleaned up)_

## Where the project stands
- **V1 is implemented and working** (2026-08-11). Details in CHANGELOG.md [0.1.0] and
  docs/reviews/V1-QA.md.
- **Purpose (owner, 2026-10-29):** a tool that helps the owner keep up with AI rules
  and the AI landscape in a new role as an enterprise AI leader. It is also a public
  portfolio piece, to be linked from mattguenther.com once the records can be trusted.
- **2026-10-29 skeptic review**, recorded here because it lived only in conversation:
  - The news feed was mostly noise.
  - Impact scores reflect the source, not the content.
  - The curated records were stale.
  - Direction proposed, not adopted: an evidence-backed "who must do what, by when"
    dataset, a "what changed" feed, a weekly brief drafted by AI and approved by the
    owner, and read-only agent access (MCP). That needs the owner's go-ahead and a
    decision revisiting DEC-007.
- **2026-11-25 session** (CHANGELOG [Unreleased]):
  - The September work (honest dashboard, static public site) is committed.
  - **All 29 curated records were checked against primary sources** (T-038,
    docs/reviews/2026-11-25-records-verification.md), and the approved changes are
    applied. Colorado SB 26-189 is a new record.
  - Regulation confidence now ages with its verification (DEC-031).
  - Re-seeding replaces corrected events and renamed incidents.
  - NIST News and the Federal Register keep only AI items; The Register is disabled.
  - The local database was rebuilt fresh with demo data off; the old one is
    `data/radar-2026-09-30.db`.
  - Gates: backend 76 tests, ruff, mypy; frontend 16 tests, tsc, eslint, build.
    Checked in a browser: dashboard, regulations table, Colorado detail, the
    "confidence lowered" notice, and incidents with blank dates.
- **Nothing is pushed or deployed.** `main` is ahead of `origin/main` by several
  commits. Pushing to `main` triggers `.github/workflows/publish.yml`, which still
  targets GitHub Pages.

## Next steps
1. **T-039: deploy privately on Cloudflare.** The owner chose Workers static assets
   behind Cloudflare Access until the site goes public. This needs the owner's
   Cloudflare API token as a GitHub secret and an Access policy. Change publish.yml
   before pushing.
2. **Go public** once the owner is satisfied with the records, then link it from
   mattguenther.com. Gate: the README promises "the date a human last verified it",
   and the detail page says fields are "human-verified". The 2026-11-25 check was done
   by AI agents and approved by the owner without reading the sources. Before going
   public, either the owner reads the official pages for the nine material records
   (see the report), or that wording changes to say how records are checked. That is a Netlify site, so a production deploy costs 15 credits:
   ask first.
3. T-041 new records, T-040 data-model gaps, T-035 mobile, T-036 page weight, T-037
   About page.
4. Open question: real items almost never reach the 70 "high impact" threshold, so
   that KPI usually reads 0. Calibrate it or relabel it.
5. **Re-check records by 2027-02-23** (90 days; DEC-031 lowers confidence after that).
   Re-check sooner for Colorado SB 26-189 (effective 2027-01-01, rules and the xAI suit
   pending) and Brazil.

## How to run it
```bash
cd frontend && npm install && npm run build && cd ..             # UI (once)
cd backend && python -m venv venv && venv/bin/pip install -e .   # Windows: venv\Scripts\...
venv/bin/python -m app.cli serve                                 # http://127.0.0.1:8000
# backend/.env (gitignored) on the Linux machine sets DEMO_DATA=false and
# SCHEDULER_ENABLED=true, so `serve` keeps data fresh and never loads demo items.
venv/bin/python -m app.cli ingest --force                        # pull real sources
```
This repo is used on two machines. `backend/.venv` is a Windows venv; on the Linux
machine the working venv is `backend/venv` (both are gitignored). `frontend/node_modules`
is platform-specific, so run `npm ci` after switching OS.

Static site locally:
```bash
cd frontend && npm run build:static
cd ../backend && venv/bin/python -m app.cli export-static --out ../frontend/dist-static/data
```
Then serve `frontend/dist-static` with any static server.

## Known limitations
- Static site: detail-page deep links return HTTP 404 (served by 404.html). They work
  for people but not for link unfurlers or crawlers. Top-level pages return 200. The
  Cloudflare deploy (T-039) fixes this with SPA fallback.
- Several official sites refuse automated readers: EUR-Lex, California leginfo, CanLII,
  and Colorado's legislature without browser headers. ilga.gov serves an incomplete TLS
  certificate chain. Page-watch sources on these may fail.
- GitHub disables scheduled workflows after 60 days without repo activity. The
  per-run `radar-data` push should count as activity (unverified).
- `.github/workflows/ci.yml` still pins older action majors (checkout@v4 etc.);
  publish.yml uses current ones (v7 / pages v5).
- Automated axe scan and the 10k-item performance smoke are still deferred (V1 caveats).

## How to resume a session
Read CLAUDE.md → this file → TASKS.md → DECISIONS.md (DEC-001…031). Keep the hard
rules: curated legal facts only, SafeFetcher for all outbound HTTP, no LLM code in
core, attribution everywhere, demo data always flagged and never published.
