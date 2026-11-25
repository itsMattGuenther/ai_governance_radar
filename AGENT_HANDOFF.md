# Agent Handoff

_Last updated: 2026-11-25 (Watch Board rebuild shipped)_

## Where the project stands
- **V1 is implemented and working** (2026-08-11). Details in CHANGELOG.md [0.1.0] and
  docs/reviews/V1-QA.md.
- **Public site: https://aigov.mattguenther.com** (DEC-032), an assets-only Cloudflare
  Worker, rebuilt every 6 hours and on pushes to main by publish.yml. The repo is
  `itsMattGuenther/ai_governance_radar`.
- **Purpose (owner, 2026-10-29):** a tool that helps the owner keep up with AI rules
  and the AI landscape in a new role as an enterprise AI leader. It is also a public
  portfolio piece, to be linked from mattguenther.com.
- **2026-10-29 skeptic review**, recorded here because it lived only in conversation:
  the news feed was mostly noise; impact scores reflect the source, not the content;
  the curated records were stale. Direction proposed, not adopted: an evidence-backed
  "who must do what, by when" dataset, a weekly brief drafted by AI and approved by the
  owner, and read-only agent access (MCP). That needs the owner's go-ahead and a
  decision revisiting DEC-007.
- **2026-11-25:**
  - All 29 curated records were checked against primary sources (T-038,
    docs/reviews/2026-11-25-records-verification.md) by AI research agents, and the
    owner approved the changes. Confidence now ages with its check (DEC-031).
  - **The Watch Board rebuild shipped** (DEC-033, T-042 to T-048, CHANGELOG
    [Unreleased]). Home leads with the next legal dates, record changes and every law
    by stage. Laws carry curated milestones and successor links, stored in two new
    tables (`regulation_milestones`, `regulation_successions`). The Laws page has next
    dates and a small coverage map. Record pages have a milestone strip. Incident
    reports are grouped by the AI Incident Database's incident number. All Sources has
    tabs by source tier. About carries the methodology and the source list. The public
    build publishes `data/milestones.ics` and `data/changes.xml`. Initial JS is 331 KB
    (it was 3.6 MB).
  - Kept databases upgrade with no manual step: new tables come from `create_all()`,
    and one-time repairs run from `seed_all`, recorded in `app_state` (DEC-034). The
    first two repairs decoded HTML entities in stored text and grouped stored incident
    reports.
  - Gates: backend 102 tests, ruff, mypy; frontend 45 tests, tsc, eslint, build.

## Next steps
1. **Link the site from mattguenther.com.** That is a Netlify site, so a production
   deploy costs 15 credits: ask first.
2. **A date for the owner to decide:** Colorado SB 24-205's text says it is repealed
   and reenacted by SB 26-189 from 1 Jan 2027, but the superseded record has no
   milestone for that date. Its successor already lists 1 Jan 2027 as "takes effect", so
   this is probably intended. No other record mentions a future date that lacks a
   milestone.
3. **Re-check records by 2027-02-23** (90 days; DEC-031 lowers confidence after that).
   Re-check sooner for Colorado SB 26-189 (effective 2027-01-01, rules and the xAI suit
   pending) and Brazil. Milestones are legal dates and are part of every re-check. The
   EU AI Act's 2 Dec 2026 milestone passes soon. Confidence ageing looks at the
   effective date and compliance deadline only, not milestones; widening it would need a
   decision.
4. T-041 new records, and the rest of T-040 (date precision, evidence per field,
   `last_verified_at` on standards and incidents).
5. The impact score never reads content (DEC-030). It no longer ranks anything on Home
   and only orders All Sources, so retuning it is low priority.

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

Static site locally, as the public site serves it:
```bash
cd frontend && npm run build:static
cd ../backend && venv/bin/python -m app.cli export-static --out ../frontend/dist-static/data
cd .. && npx wrangler dev        # http://localhost:8787; deep links work as in production
```
`wrangler dev` keeps its asset list from start-up; restart it (or touch
`wrangler.jsonc`) after a rebuild.

## Known limitations
- The AI Incident Database feed has no incident field. The incident number is read from
  the citation link that ends each description (`/cite/<incident>#<report>`). Four of
  the 100 reports stored before grouping had that link cut off by the 500-character
  excerpt, so they stay ungrouped.
- Some page-watch sources (OWASP GenAI, EUR-Lex, NIST AI RMF, Stanford HAI) report a
  change on most runs. Their alerts lead the tier-1 tab of All Sources; the "Page-change
  alerts" toggle hides them.
- Cloudflare serves `changes.xml` as `application/xml` rather than
  `application/atom+xml`. Feed readers accept it.
- `ruff format --check` fails on older backend modules. It is advisory in CI.
- `cloudflare/wrangler-action@v3` runs on deprecated Node 20, and GitHub forces it to
  Node 24 with a warning. Move to a newer major when one exists.
- Several official sites refuse automated readers: EUR-Lex, California leginfo, CanLII,
  and Colorado's legislature without browser headers. ilga.gov serves an incomplete TLS
  certificate chain. Page-watch sources on these may fail.
- GitHub disables scheduled workflows after 60 days without repo activity. The
  per-run `radar-data` push should count as activity (unverified).
- `.github/workflows/ci.yml` still pins older action majors (checkout@v4 etc.);
  publish.yml uses current ones.
- Automated axe scan and the 10k-item performance smoke are still deferred (V1 caveats).

## How to resume a session
Read CLAUDE.md → this file → TASKS.md → DECISIONS.md (DEC-001…034). Keep the hard
rules: curated legal facts only, SafeFetcher for all outbound HTTP, no LLM code in
core, attribution everywhere, demo data always flagged and never published.
