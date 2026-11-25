# Build brief: the Watch Board rebuild

This folder is temporary. It exists to hand one build from a review session to the
agent that carries it out, and T-048 deletes it.

## What you are building

The owner reviewed the public site (https://aigov.mattguenther.com) on 2026-11-25 and
approved a rebuild: Home leads with legal dates and record changes, and the whole site
moves to a new visual system. The decision is DEC-033.

## Where the truth lives

Read these in this order. When two disagree, the earlier one wins.

1. `CLAUDE.md` — hard rules and working practice. They all still apply.
2. `DECISIONS.md` DEC-033 — what was decided and why.
3. `DESIGN_SYSTEM.md` — the visual system: tokens, components, layout.
4. `TASKS.md` T-042 to T-048 — the work, in order, with acceptance checks.
5. `docs/handoff/ux-rebuild/review.html` — the review itself. Open it in a browser.
   It holds the evidence for each defect, the page-by-page recommendations, and a
   working mock-up of the new Home. The mock-up's CSS (classes starting `w-` and
   `.wb`) is the reference for spacing, sizes and colour use.
6. `docs/handoff/ux-rebuild/shots/` — the site before the rebuild, for comparison.

The mock-up was drawn by hand from the records as they stood that day. **The data is
the authority, not the mock-up**: the seed file now holds more milestones than the
mock-up shows (California and Utah have one each), so the built panel will differ.
The grey code tiles in the mock-up's law rows stand in for the flags, which stay.
Where the review shows an earlier "flat console" option, ignore it; the owner chose
the "balanced" one, and DESIGN_SYSTEM.md describes it.

## Decisions already made

- The visual direction is the balanced "Watch Board". Do not reopen it.
- Top tabs replace the side rail.
- `accent` is the link colour; `sev-watch` amber is reserved for dates that are close.
- The map leaves Home and goes, smaller and flat, on the Laws page.
- Flags stay, small and square-cornered. Source monograms become plain code tiles.
- No Morning Brief page, no watchlist, no light theme, no LLM code (DEC-007, DEC-028).

## Rules for this build

- **Branch.** Work only on `ux-rebuild`. Never push to `main` and never merge into it:
  a push to main deploys the public site within a minute.
- **Legal facts.** Milestone dates are already in `data/seed/entities.json`, taken
  from record text verified on 2026-11-25. Do not add, edit or infer dates, statuses
  or penalties. Nothing may parse dates out of notes text. If a date seems to be
  missing, write it in AGENT_HANDOFF.md for the owner and move on.
- **Scope.** T-042 to T-048 only. CLAUDE.md says to work TASKS.md top-down; for this
  build that means this section. Leave T-040 and T-041 alone: T-041 adds legal
  records, which needs the owner and primary sources. The calendar and change feeds
  in T-047 were un-parked by the owner (DEC-033); everything else under "Post-V1"
  stays parked.
- **One task at a time, in order.** Set its status to IN PROGRESS, finish it, verify
  it, set it to DONE with a one-line outcome, commit, then start the next. Do not stop
  between tasks to ask for approval; stop only for something the owner must decide.
- **Verify in a browser, not only in tests.** After each task that changes the UI,
  look at every page it touched at 1440×900 and 390×844, and compare Home with the
  mock-up. On this machine:
  - Build and export: `npm run build:static` in `frontend`, then
    `venv/bin/python -m app.cli export-static --out ../frontend/dist-static/data` in
    `backend`.
  - Serve with `npx wrangler dev` from the repo root. It reads `wrangler.jsonc`, so
    deep links such as `/entities/eu-ai-act` work as they do in production. A plain
    static server returns 404 for them.
  - Screenshot with headless Chromium, which honours the size you ask for:
    `chromium --headless=new --hide-scrollbars --virtual-time-budget=6000
    --window-size=390,844 --screenshot=/path/out.png http://localhost:8787/`.
    The desktop browser here is tiled by the window manager and ignores resize
    requests, so do not trust a resized window for phone checks.
  - Keep screenshots in a scratch directory outside the repo.
- **If your context resets**, re-read this brief and continue from the first task in
  T-042 to T-048 that is not DONE.
- **Gates** (TEST_PLAN.md §2) after each task: `ruff check app tests && mypy app &&
  pytest` in `backend`, and `npm run lint && npm run typecheck && npm test && npm run
  build:static` in `frontend`. On this Linux machine the backend venv is
  `backend/venv`.
- **Commits** are the owner's alone: no AI attribution of any kind in commit
  messages, the pull request, comments or files.
- **Accessibility** (DESIGN_SYSTEM.md §11) on every component: a word beside every
  colour, AA contrast, keyboard access, reduced motion honoured.
- Keep dependencies few. Replacing the two font packages is expected; anything else
  new needs a reason written in the commit message.

## Details the tasks leave open

- **Tied dates.** California SB 53 and Colorado SB 26-189 both have a milestone on
  1 Jan 2027. The two tiles show the next two distinct dates, and each names every
  law that falls on its date. Dates ahead lists one row per milestone.
- **"Records checked"** in the status strip is the oldest `last_verified_at` among the
  laws, and "next check due" is that date plus `REVERIFY_DAYS`.
- **Stage track.** Only the five stages in DESIGN_SYSTEM.md §5 fill segments. A law
  with `superseded_by` shows as superseded. Any other status shows its chip with an
  empty track. Never infer a stage.
- **Local app.** The same pages run against the live API in the local app
  (`STATIC_MODE` false), which keeps Settings. Check both modes.

## When everything is built: T-048

The owner asked that nothing made only for this build be left behind. Before opening
the pull request:

- Delete this folder (`docs/handoff/ux-rebuild/`) and every mention of it.
- Remove code nothing uses any more: old components (the counter card, sparkline and
  donut, score ring and dots, source monograms, the old card), styles, tokens, hooks,
  API fields, export fields, tests and packages.
- Make the standing documents describe what shipped: README, ARCHITECTURE,
  DATA_MODEL, PRODUCT_SPEC, TEST_PLAN, DESIGN_SYSTEM (status SHIPPED), CLAUDE.md's
  "Current state" lines, CHANGELOG. Add no build instructions to any of them.
- Rewrite AGENT_HANDOFF.md as the state of the project after the build.
- Leave no scratch screenshots, temp scripts, commented-out code or stray TODOs. Stop
  any servers you started and close any browser tabs you opened. `git status` clean.
- Do not delete things you did not create: the owner's local database backups, the
  review page on claude.ai, and `docs/design/V2-DESIGN-DIRECTION.md` all stay.

Then push `ux-rebuild` and open one pull request to `main`. In its description, say
what changed for a visitor, list anything you could not do or chose not to do and why,
and list any dates you think are missing from the records. Do not merge it.
