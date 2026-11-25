# Design System — "Watch Board"

**Status: SHIPPED 2026-11-25 (DEC-033).** Chosen by the owner after a UX review of the
public site. It replaces "Refined Intelligence Dashboard" (DEC-025). The earlier research in
[docs/design/V2-DESIGN-DIRECTION.md](docs/design/V2-DESIGN-DIRECTION.md) still applies
where it argues for small radii, a status strip, absolute time and no glow.

Quality bar: the flat, dense discipline of a defence or operations console, with
enough colour and separation to skim at a glance. Not a wall of same-weight text, and
not a rounded, glowing SaaS dashboard.

## 1. Principles

1. **Colour, shape and size must encode something**: how close a date is, what stage
   a law has reached, which panel you are in. Anything that only decorates goes.
2. **One coloured object per row.** A row with five coloured things has no signal.
3. **Three levels of ink per row**: bright title, quieter detail, mono data.
4. **Real dates.** Absolute dates and day counts; the data stamp is in UTC.
5. **The system shows its own state**: data time, refresh interval, source health and
   the last record check are always on screen.

**Avoid:** gradients, drop shadows, glow, radii above 6px, a second chip on a row,
uppercase mono for running text, score rings or dots on list rows, constant motion,
and tactical decoration that carries no information (crosshairs, scan lines, fake
coordinates). **Never** use real classification markings, agency seals or insignia.

## 2. Color tokens

Defined in `frontend/tailwind.config.js`, mirrored for inline/SVG use in
`frontend/src/lib/tokens.ts` — **keep the two in sync**. Token names are unchanged
from the previous system; only values change.

| Token | Value | Use |
|---|---|---|
| `bg-base` | `#0B0F13` | page background, flat (no radial wash) |
| `bg-surface` | `#131A20` | panels and tiles, flat (no gradient) |
| `bg-raised` | `#19222B` | panel headers, hover, code tiles, popovers |
| `bd-subtle` | `#26323C` | panel and row borders |
| `bd-strong` | `#3A464F` | emphasis borders, empty stage-track segments |
| `tx-primary` | `#E4E9EC` | titles, values |
| `tx-secondary` | `#A8B3BA` | detail lines, labels |
| `tx-muted` | `#7F8B93` | counts, placeholders — 5.0:1 on `bg-surface`, 4.6:1 on `bg-raised` |
| `accent` | `#5FC3D7` | links, active nav, focus ring, the radar mark's structure |

Semantic colours. They mean status and nothing else:

| Token | Value | Meaning |
|---|---|---|
| `sev-critical` | `#F3726B` | critical severity, failures |
| `sev-high` | `#EE8A45` | high severity |
| `sev-watch` | `#E3A63A` | attention: a date within 60 days, a law signed but not yet in force |
| `sev-positive` | `#4FB477` | in force, enforced, healthy |
| `sev-info` | `#6AA8E8` | introduced, informational, notes |
| `sev-emerging` | `#A78BFA` | standards updates, research |

Other fixed values: notice banner background `#2B2412` with `sev-watch` text; radar
sweep `#4FE58F` (unchanged).

Rules: colour is **never** the only signal — every state carries a word. All text
pairs meet AA; chip text on its own 15% tint is at least 4.5:1, including over
`bg-raised` when a row is hovered (the reason `sev-critical` is `#F3726B` rather than
the first proposal's `#F26D66`, which measured 4.46:1 there).

## 3. Brand mark

`RadarLogo`: `accent` structure with the green sweep. It is the only thing on the page
that moves (5s rotation, off under `prefers-reduced-motion`). Lockup in the top bar:
20px mark, "AI Governance" in sans semibold, "RADAR" in tracked mono `accent`.

## 4. Typography

- UI and body: **IBM Plex Sans** (400/500/600). Dates, codes, numbers and the status
  strip: **IBM Plex Mono** (400/500), always `tabular-nums`. Self-hosted through
  `@fontsource`, latin subset only. Mono is for data, never for sentences.
- Scale: 11px mono (status strip, counts) · 12px labels · 12.5px detail lines ·
  13px panel titles (semibold, normal case) · 13.5px row titles (medium) · 20px page
  titles · 30px tile numerals (mono 500). Adjust the Tailwind scale to carry these;
  do not scatter arbitrary sizes.
- Uppercase only in the notice banner, the status strip and mono date columns.

## 5. Components

| Component | Treatment |
|---|---|
| **Panel** | `bg-surface`, 1px `bd-subtle`, 6px radius, no shadow. Panels are separate objects with 12px gaps between them. |
| **Panel header** | `bg-raised` band with a bottom border: 8px square marker (2px radius) in the panel's subject colour, 13px semibold title, and a mono 11px count or window on the right. |
| **Tile** | 12px label, 30px mono numeral with its unit in small sans, 12.5px detail line. The `hot` variant (9% `sev-watch` tint, 40% `sev-watch` border, `sev-watch` numeral) is used only when the tile shows a date within 60 days. No sparklines or icons. |
| **Chip** | 4px radius, 11px semibold sans, 4×7px padding; coloured text on a 15% tint with a 38% border of the same colour. Quiet variant: `bd-subtle` outline, `tx-secondary` text. One per row. |
| **Day count** | A chip reading "37 days". Filled `sev-watch` within 60 days, quiet beyond that, absent for past dates. In table cells that already hold a stage chip, the count is text instead (amber within 60 days), so the row keeps one chip. |
| **Stage track** | Five 11×6px segments, 2px apart, filled up to the law's stage: introduced 1, passed 2, signed 3, in force 4, enforced 5. Always paired with the stage chip, and labelled for screen readers ("Stage 3 of 5: signed"). A superseded law shows an empty track and a quiet "✕ Superseded" chip. |
| **Code tile** | Mono 10.5px code on `bg-raised` with a `bd-subtle` border and 3px radius: `US-CO`, `GOV.UK`, `OWASP`. Replaces the coloured source monograms. |
| **Flag** | Real SVG flags stay, 18×12px with 2px corners, beside the jurisdiction code. Never circular, never fetched from anywhere but the site itself; each loads only when shown (country flags as small SVG files, US state flags as their own script chunks). Decorative: the code carries the meaning. |
| **Row** | Optional mono date column, then a 13.5px medium `tx-primary` title over a 12.5px `tx-secondary` detail line, then at most one chip. 10×14px padding, `bd-subtle` divider, `bg-raised` hover. A row whose date is within 60 days gets a 6% `sev-watch` tint. |
| **InfoTip** | Unchanged: every classifier is defined from `lib/definitions.ts`. The About page carries the same definitions for touch users. |

Chip tones. Laws: introduced/proposed = info · passed/signed = watch · in force and
enforced = positive · superseded = quiet. Standards: final = positive ·
updated/amended = emerging · draft/comment = watch · withdrawn = critical. Record
events: note = info · status change = watch · document updated = emerging. Incident
severity: critical · high · medium = watch · low = info. Fact status and confidence
chips are quiet unless they warn (alleged, disputed, confidence lowered). In tables
whose row already has a chip, they are words: quiet, or `sev-high` with a ▲ when they
warn.

Panel marker colours: dates = watch · record changes = accent · laws = emerging ·
standards = info · incidents = high · sources and feed = positive.

**Scores.** Impact and confidence do not appear as rings or dots on list rows. They
are columns and filters on All Sources and are explained, with the points breakdown,
in the item drawer. On laws, confidence shows only when it is below high.

## 6. Shell and layout

- **Notice banner**, above everything at every width: "Open-source data · Not legal
  advice · Verify against the linked official source".
- **Top bar**: brand lockup, six tabs (Watch, Laws, Standards, Incidents, All sources,
  About), search on the right, focused with `/`. No side rail. Route paths are
  unchanged; the local app adds Settings.
- **Status strip** under the top bar, mono 11px: data time in UTC (the public build's
  export time, or the newest collection in the local app), refresh interval (every 6 h
  on the public site, the sources' polling range locally), sources OK (collected at
  least once and not failing; links to the source list), the oldest record check and
  the next check due (that date plus 90 days).
- **Phone**: bottom tab bar with Watch, Laws, Standards, Incidents, All; About in the
  header. No horizontal body scroll from 360px. Tables become stacked rows.
- **Home ("Watch")**: tiles (next two dates, record changes in 30 days, records
  tracked, items collected in 7 days), then four panels in two columns: Dates ahead,
  Record changes, Laws by stage, From government sources. The two date tiles are wider
  than the rest. A date shared by several laws names each of them.
- **Laws**: the coverage map, then one table sorted by next date and latest change:
  jurisdiction, law, stage, next date, last change, and the checked date (or the
  confidence when it is below high). A superseded law sits under its successor.
- **Record page**: credentials (checked date, official source, copy link) beside the
  title; a milestone strip under it, with past dates muted, a today marker and dates
  ahead with their day counts (a list on phones).
- **All sources**: tabs by source tier — government and standards bodies, research and
  incident databases, press — opening on the first, plus All, which a count elsewhere
  links to so the number equals the list. Impact and confidence are columns.

## 7. Dates ahead

Every list of upcoming dates reads curated **milestones** only (DEC-033, hard rule 1).
Dates are never parsed out of notes text or inferred.

## 8. Time

Absolute dates everywhere: `25 Nov 2026` in text, `25 NOV` (year beneath when it is
not the current year) in mono date columns. Future dates also show a day count. The
data stamp is UTC: `25 NOV 2026 15:13Z`. No "2d ago" or "1y ago".

## 9. Map

Lives on the Laws page above the table, about a third of its former height. Flat land,
flat `accent` markers, no glow. Shading is `accent` at three strengths for 1, 2–3 and
4+ tracked records, named beside the map; it never means "good" or "bad". Beside it, a
list of every country with records and its count is the text alternative and the
keyboard route; selecting one filters the table, or opens Standards for a country with
frameworks only. Natural Earth 110m, loaded only on this page; countries too small to
have a polygon there (Singapore) and the EU get a marker at a fixed point.

## 10. Motion

150ms ease-out colour transitions and the radar sweep. No pulsing dots, no hover
lift. Everything honors `prefers-reduced-motion`.

## 11. Accessibility checklist (per feature)

- [ ] Full keyboard operability, logical tab order, visible focus ring (2px accent)
- [ ] Semantic HTML first; ARIA only where semantics fall short
- [ ] Labels for icon-only controls; aria on stage tracks and status glyphs
- [ ] AA contrast for text; status colours always paired with a word
- [ ] No colour-only state communication
- [ ] Responsive without horizontal body scroll; reduced-motion respected
