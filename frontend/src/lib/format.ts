/** Date/text formatting helpers. */

/** Parse an API timestamp. The backend stores UTC but SQLite drops the offset, so
 * "2026-09-23T22:33:00" arrives without one — and `new Date()` would read it as
 * local time, skewing every relative time by the viewer's UTC offset. */
export function parseTimestamp(iso: string): Date {
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(iso.includes("T") && !hasZone ? `${iso}Z` : iso);
}

// Calendar dates (effective dates, milestones) are stored as UTC midnight, so they
// render in UTC: otherwise "30 Jun" becomes "29 Jun" for every viewer west of UTC.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utcParts(iso: string | null | undefined): { d: number; m: number; y: number } | null {
  if (!iso) return null;
  const date = parseTimestamp(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { d: date.getUTCDate(), m: date.getUTCMonth(), y: date.getUTCFullYear() };
}

/** "25 Nov 2026" — the date in running text (DESIGN_SYSTEM.md §8). */
export function absDate(iso: string | null | undefined): string {
  const p = utcParts(iso);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : "—";
}

/** Mono date column: "02 DEC", with the year shown beneath when it isn't this year. */
export function dateColumn(iso: string, now = new Date()): { day: string; year: string | null } {
  const p = utcParts(iso);
  if (!p) return { day: "—", year: null };
  return {
    day: `${String(p.d).padStart(2, "0")} ${MONTHS[p.m].toUpperCase()}`,
    year: p.y === now.getUTCFullYear() ? null : String(p.y),
  };
}

/** Data stamp in UTC: "25 NOV 2026 15:13Z". */
export function utcStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseTimestamp(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${absDate(iso).toUpperCase()} ${hh}:${mm}Z`;
}

/** Whole days from today (UTC) to a calendar date; negative once it has passed. */
export function daysUntil(isoDate: string, now = new Date()): number {
  const target = parseTimestamp(isoDate.slice(0, 10));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - today) / 86_400_000);
}

/** Add days to a timestamp; returns an ISO string. */
export function addDays(iso: string, days: number): string {
  return new Date(parseTimestamp(iso).getTime() + days * 86_400_000).toISOString();
}

export function verificationAgeDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = parseTimestamp(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

const CATEGORY_LABELS: Record<string, string> = {
  regulation: "Regulation",
  standard: "Standard",
  incident: "Incident",
  security: "Security",
  research: "Research",
  news: "News",
  training: "Training",
  event: "Event",
  ranking: "Ranking",
};

export const categoryLabel = (c: string): string => CATEGORY_LABELS[c] ?? c;

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
