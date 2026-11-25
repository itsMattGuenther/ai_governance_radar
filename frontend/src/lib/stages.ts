/** Where a law stands (DESIGN_SYSTEM.md §5). Only the five named stages fill the
 * stage track; a superseded law and any other status get an empty track. A stage is
 * never inferred from dates or text. */

import type { RegulationOut } from "./types";
import type { Tone } from "../components/ui/Chip";

export const STAGES = ["introduced", "passed", "signed", "effective", "enforcement"] as const;

export interface LawStage {
  /** 1–5 when the status is one of the five stages, else 0 (empty track). */
  stage: number;
  label: string;
  tone: Tone;
  superseded: boolean;
}

const LABELS: Record<string, string> = {
  proposed: "Proposed",
  introduced: "Introduced",
  passed: "Passed",
  signed: "Signed",
  effective: "In force",
  amended: "Amended",
  enforcement: "Enforced",
};

const TONES: Record<string, Tone> = {
  proposed: "info",
  introduced: "info",
  passed: "watch",
  signed: "watch",
  effective: "positive",
  enforcement: "positive",
};

export function lawStage(reg: Pick<RegulationOut, "status" | "superseded_by">): LawStage {
  if (reg.superseded_by) return { stage: 0, label: "Superseded", tone: "quiet", superseded: true };
  const index = (STAGES as readonly string[]).indexOf(reg.status);
  return {
    stage: index + 1,
    label: LABELS[reg.status] ?? reg.status.replace(/_/g, " "),
    tone: TONES[reg.status] ?? "quiet",
    superseded: false,
  };
}
