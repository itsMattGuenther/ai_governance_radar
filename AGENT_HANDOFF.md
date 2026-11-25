# Agent Handoff

_Last updated: 2026-11-25 (records verified; public site live; Watch Board rebuild approved, not yet built)_

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
- **Public site: https://aigov.mattguenther.com** (DEC-032), an assets-only Cloudflare
  Worker, deployed every 6 hours and on pushes to main by publish.yml. The first run
  succeeded on 2026-11-25. The repo moved to `itsMattGuenther/ai_governance_radar`, and
  the local `origin` points there.

## Next steps
1. **Build the Watch Board rebuild** (DEC-033, approved by the owner on 2026-11-25
   after a UX review). Start with `docs/handoff/ux-rebuild/BUILD_BRIEF.md`, then work
   T-042 to T-048 in TASKS.md on the `ux-rebuild` branch. Nothing is built yet: the
   branch holds the decision, the new DESIGN_SYSTEM.md, the tasks, the review and the
   curated milestone dates (`regulation.milestones` in `data/seed/entities.json`).
   Main and the public site still show the previous design.
2. **Link it from mattguenther.com** once the rebuild is merged. That is a Netlify
   site, so a production deploy costs 15 credits: ask first.
3. T-041 new records, and the rest of T-040 (date precision, evidence per field,
   `last_verified_at` on standards and incidents).
4. **Re-check records by 2027-02-23** (90 days; DEC-031 lowers confidence after that).
   Re-check sooner for Colorado SB 26-189 (effective 2027-01-01, rules and the xAI suit
   pending) and Brazil. Milestones are legal dates and are part of every re-check.

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
- `cloudflare/wrangler-action@v3` runs on deprecated Node 20, and GitHub forces it to
  Node 24 with a warning. Move to a newer major when one exists.
- Several official sites refuse automated readers: EUR-Lex, California leginfo, CanLII,
  and Colorado's legislature without browser headers. ilga.gov serves an incomplete TLS
  certificate chain. Page-watch sources on these may fail.
- GitHub disables scheduled workflows after 60 days without repo activity. The
  per-run `radar-data` push should count as activity (unverified).
- `.github/workflows/ci.yml` still pins older action majors (checkout@v4 etc.);
  publish.yml uses current ones (v7 / pages v5).
- Automated axe scan and the 10k-item performance smoke are still deferred (V1 caveats).

## How to resume a session
Read CLAUDE.md → this file → TASKS.md → DECISIONS.md (DEC-001…033). Keep the hard
rules: curated legal facts only, SafeFetcher for all outbound HTTP, no LLM code in
core, attribution everywhere, demo data always flagged and never published.
