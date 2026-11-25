/** Stage track (DESIGN_SYSTEM.md §5): five segments filled to the law's stage, always
 * beside its stage chip and labelled for screen readers. */

import clsx from "clsx";

import { lawStage } from "../../lib/stages";
import type { RegulationOut } from "../../lib/types";
import { Chip, type Tone } from "./Chip";

const FILL: Record<Tone, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  watch: "bg-sev-watch",
  positive: "bg-sev-positive",
  info: "bg-sev-info",
  emerging: "bg-sev-emerging",
  quiet: "bg-tx-secondary",
};

export function StageTrack({ stage, tone }: { stage: number; tone: Tone }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={clsx("h-1.5 w-[11px] rounded-[1.5px]", n <= stage ? FILL[tone] : "bg-bd-strong")}
        />
      ))}
    </span>
  );
}

/** Stage chip plus track, e.g. "Signed ▮▮▮▯▯". */
export function LawStage({
  regulation,
  track = true,
}: {
  regulation: Pick<RegulationOut, "status" | "superseded_by">;
  track?: boolean;
}) {
  const s = lawStage(regulation);
  const sr = s.superseded
    ? "Superseded"
    : s.stage
      ? `Stage ${s.stage} of 5: ${s.label.toLowerCase()}`
      : `${s.label}; not one of the five stages`;
  return (
    <span className="inline-flex items-center gap-2.5" role="img" aria-label={sr}>
      <Chip tone={s.tone}>{s.superseded ? "✕ Superseded" : s.label}</Chip>
      {track && <StageTrack stage={s.stage} tone={s.tone} />}
    </span>
  );
}
