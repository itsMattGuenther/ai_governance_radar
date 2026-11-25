/** Chip (DESIGN_SYSTEM.md §5): coloured text on a 15% tint with a 38% border, or a
 * quiet outline. Always a word, never colour alone. One per row. */

import clsx from "clsx";

import { absDate, daysUntil } from "../../lib/format";
import { SOON_DAYS } from "../../lib/records";

export type Tone = "critical" | "high" | "watch" | "positive" | "info" | "emerging" | "quiet";

// Full class strings so Tailwind keeps them.
const TONES: Record<Tone, string> = {
  critical: "font-semibold text-sev-critical bg-sev-critical/15 border-sev-critical/[.38]",
  high: "font-semibold text-sev-high bg-sev-high/15 border-sev-high/[.38]",
  watch: "font-semibold text-sev-watch bg-sev-watch/15 border-sev-watch/[.38]",
  positive: "font-semibold text-sev-positive bg-sev-positive/15 border-sev-positive/[.38]",
  info: "font-semibold text-sev-info bg-sev-info/15 border-sev-info/[.38]",
  emerging: "font-semibold text-sev-emerging bg-sev-emerging/15 border-sev-emerging/[.38]",
  quiet: "font-medium text-tx-secondary border-bd-subtle",
};

export function Chip({
  tone = "quiet",
  children,
  title,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-ctl border px-[7px] py-1 text-meta leading-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** "37 days" to a future date: amber within 60 days, quiet beyond, nothing once past. */
export function DayCount({ date, now }: { date: string; now?: Date }) {
  const days = daysUntil(date, now);
  if (days < 0) return null;
  const text = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  return (
    <Chip tone={days <= SOON_DAYS ? "watch" : "quiet"} title={`${text} until ${absDate(date)}`}>
      {text}
    </Chip>
  );
}
