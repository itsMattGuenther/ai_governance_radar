/** Date/text formatting helpers. */

/** Parse an API timestamp. The backend stores UTC but SQLite drops the offset, so
 * "2026-09-23T22:33:00" arrives without one — and `new Date()` would read it as
 * local time, skewing every relative time by the viewer's UTC offset. */
export function parseTimestamp(iso: string): Date {
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(iso.includes("T") && !hasZone ? `${iso}Z` : iso);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = parseTimestamp(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Calendar dates (effective dates, occurred-on) are stored as UTC midnight, so they
// render in UTC — otherwise "Jun 30" becomes "Jun 29" for every viewer west of UTC.
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseTimestamp(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
}

export function longDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseTimestamp(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
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
