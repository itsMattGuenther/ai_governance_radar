# Agent Handoff

_Last updated: 2026-09-29 (dashboard honesty fixes + public static site)_

## Where the project stands
- **V1 is implemented and working** (2026-08-11). Details in CHANGELOG.md [0.1.0] and
  docs/reviews/V1-QA.md.
- **2026-09-29 session** (CHANGELOG [Unreleased]):
  - Dashboard numbers made honest (DEC-030): windows use publication date, and KPIs
    match their drill-downs.
  - Top Developments no longer pinned by demo items or "Page changed" alerts.
  - AA contrast for muted text.
  - UTC timestamp parsing fix.
  - Built the **public read-only static site** (DEC-029, T-034).
  - All gates green: backend 69 tests, ruff, mypy; frontend 16 tests, eslint, tsc,
    build.
- **Not yet deployed.** The publish workflow was dry-run locally (every `run:` step,
  fresh start + restore) but has never run on GitHub. Going live needs the owner to:
  1. Commit and push.
  2. Enable Pages (Settings ▸ Pages ▸ Source: GitHub Actions).
  3. Run "Publish site" once.

  The expected URL is https://matthewguenther.github.io/ai_governance_radar/.

## How to run it
```bash
cd frontend && npm install && npm run build && cd ..             # UI (once)
cd backend && python -m venv venv && venv/bin/pip install -e .   # Windows: venv\Scripts\...
venv/bin/python -m app.cli serve                                 # http://127.0.0.1:8000
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

## Next steps (TASKS.md "Public site")
1. **T-038: re-verify curated regulation records.** This is maintainer work, not code.
   Records were last verified 2026-01-15, and some dates have passed (e.g., Colorado
   AI Act "effective Jun 30, 2026"). This matters most once the site is public.
2. **T-035: mobile layout.** KPI cards overflow at 390px, and the regulations table
   hides Status and Effective date on phones.
3. **T-036: page weight.** 3.6 MB JS, mostly the 50m world map and all US state flags.
4. **T-037: About/methodology page.**
5. Open question: impact scoring rarely reaches the 70 "high impact" threshold for
   real items, so the High-impact KPI is usually 0. Calibrate or relabel.

## Known limitations
- Static site: detail-page deep links return HTTP 404 (served by 404.html). They work
  for people but not for link unfurlers or crawlers. Top-level pages return 200.
- GitHub disables scheduled workflows after 60 days without repo activity. The
  per-run `radar-data` push should count as activity (unverified).
- `.github/workflows/ci.yml` still pins older action majors (checkout@v4 etc.);
  publish.yml uses current ones (v7 / pages v5).
- Automated axe scan and the 10k-item performance smoke are still deferred (V1 caveats).

## How to resume a session
Read CLAUDE.md → this file → TASKS.md → DECISIONS.md (DEC-001…030). Keep the hard
rules: curated legal facts only, SafeFetcher for all outbound HTTP, no LLM code in
core, attribution everywhere, demo data always flagged and never published.
