/** Derived views of curated records. Nothing here invents a fact: every date comes
 * from a curated field, a milestone or a timeline event (DEC-014, DEC-033). */

import { addDays, daysUntil, parseTimestamp } from "./format";
import { lawStage } from "./stages";
import type { EntityOut, Milestone } from "./types";

/** Records are re-checked at least this often (DEC-031; backend REVERIFY_DAYS). */
export const REVERIFY_DAYS = 90;

/** A date this close is "soon": amber day count, tinted row, hot tile. */
export const SOON_DAYS = 60;

/** When the record last changed: its newest timeline event, or null with no events. */
export function latestChange(entity: EntityOut): string | null {
  let latest: string | null = null;
  for (const ev of entity.events) {
    if (latest === null || ev.occurred_at > latest) latest = ev.occurred_at;
  }
  return latest;
}

/** A milestone with the law it belongs to. */
export interface DatedMilestone extends Milestone {
  entity: EntityOut;
  days: number;
}

/** Milestones from today on, soonest first (ties keep record order). */
export function upcomingMilestones(entities: EntityOut[], now = new Date()): DatedMilestone[] {
  return entities
    .flatMap((entity) =>
      (entity.regulation?.milestones ?? []).map((m) => ({ ...m, entity, days: daysUntil(m.date, now) })),
    )
    .filter((m) => m.days >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The law's next milestone from today, if any. */
export function nextMilestone(entity: EntityOut, now = new Date()): DatedMilestone | null {
  return upcomingMilestones([entity], now)[0] ?? null;
}

/** The oldest check among the laws, and when the next check is due. */
export function recordsChecked(laws: EntityOut[]): { checked: string; due: string } | null {
  const dates = laws.flatMap((e) => (e.regulation ? [e.regulation.last_verified_at] : []));
  if (!dates.length) return null;
  const oldest = dates.reduce((a, b) =>
    parseTimestamp(a).getTime() <= parseTimestamp(b).getTime() ? a : b,
  );
  return { checked: oldest, due: addDays(oldest, REVERIFY_DAYS) };
}

/** "Colorado SB 26-189 (Automated Decision-Making Technology)" → "Colorado SB 26-189". */
export const shortName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "");

/** The next two distinct dates, each naming every law that falls on it. */
export function nextDates(upcoming: DatedMilestone[]): DatedMilestone[][] {
  const groups: DatedMilestone[][] = [];
  for (const m of upcoming) {
    const last = groups[groups.length - 1];
    if (last && last[0].date === m.date) last.push(m);
    else if (groups.length < 2) groups.push([m]);
    else break;
  }
  return groups;
}

/** Laws not yet in force first, then in force, superseded last; sooner dates first. */
export function byStage(laws: EntityOut[]): EntityOut[] {
  const group = (e: EntityOut) => {
    const s = lawStage(e.regulation!);
    return s.superseded ? 2 : s.stage >= 4 ? 1 : 0;
  };
  const next = (e: EntityOut) => nextMilestone(e)?.date ?? "9999";
  return [...laws].sort(
    (a, b) => group(a) - group(b) || next(a).localeCompare(next(b)) || a.name.localeCompare(b.name),
  );
}
