/** Semantic chips: the one chip a row carries, with its tone rules from
 * DESIGN_SYSTEM.md §5. Every chip is a word; colour only reinforces it. */

import {
  CONFIDENCE_DEFS,
  FACT_STATUS_DEFS,
  IMPACT_EXPLAINER,
  SEVERITY_DEFS,
  TIER_DEFS,
  impactBand,
} from "../../lib/definitions";
import { lawStage } from "../../lib/stages";
import { Chip, type Tone } from "./Chip";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

const SEVERITY_TONE: Record<string, Tone> = {
  critical: "critical",
  high: "high",
  medium: "watch",
  low: "info",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Chip tone={SEVERITY_TONE[severity] ?? "quiet"} title={SEVERITY_DEFS[severity] ?? `Severity: ${severity}`}>
      {cap(severity)}
    </Chip>
  );
}

/** Quiet unless it warns: alleged and disputed facts. */
export function FactStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const warns = status === "alleged" || status === "disputed";
  return (
    <Chip tone={warns ? "high" : "quiet"} title={FACT_STATUS_DEFS[status] ?? `Fact status: ${status}`}>
      {cap(status)}
    </Chip>
  );
}

/** Quiet unless it warns: low confidence, or confidence lowered by an overdue check. */
export function ConfidenceBadge({ confidence, notes }: { confidence: string; notes?: string[] }) {
  const lowered = (notes?.length ?? 0) > 0;
  return (
    <Chip
      tone={lowered || confidence === "low" ? "high" : "quiet"}
      title={lowered ? `Lowered: ${notes!.join(" ")}` : (CONFIDENCE_DEFS[confidence] ?? `Confidence: ${confidence}`)}
    >
      {lowered ? `Confidence lowered: ${confidence}` : `${cap(confidence)} confidence`}
    </Chip>
  );
}

export function ImpactBadge({ score }: { score: number }) {
  const band = impactBand(score);
  return (
    <Chip title={`${band.label}: ${score}/100. ${band.meaning}\n\n${IMPACT_EXPLAINER}`}>
      Impact {score} · {band.label}
    </Chip>
  );
}

export function TierBadge({ tier }: { tier: number }) {
  return <Chip title={TIER_DEFS[tier] ?? `Tier ${tier}`}>Tier {tier}</Chip>;
}

const STANDARD_TONE: Record<string, Tone> = {
  final: "positive",
  updated: "emerging",
  amended: "emerging",
  draft: "watch",
  public_comment: "watch",
  withdrawn: "critical",
  announced: "info",
  superseded: "quiet",
};

export function StatusPill({ status, kind }: { status: string; kind: "regulation" | "standard" }) {
  if (kind === "regulation") {
    const s = lawStage({ status, superseded_by: null });
    return <Chip tone={s.tone}>{s.label}</Chip>;
  }
  return <Chip tone={STANDARD_TONE[status] ?? "quiet"}>{cap(status)}</Chip>;
}

const EVENT_CHIPS: Record<string, [string, Tone]> = {
  note: ["Note", "info"],
  status_change: ["Status change", "watch"],
  amended: ["Amended", "watch"],
  date_changed: ["Date changed", "watch"],
  enforcement: ["Enforcement", "watch"],
  document_updated: ["Updated", "emerging"],
  created: ["Created", "quiet"],
};

export function EventChip({ type }: { type: string }) {
  const [label, tone] = EVENT_CHIPS[type] ?? [cap(type), "quiet" as Tone];
  return <Chip tone={tone}>{label}</Chip>;
}

export function DemoBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Chip title="Seeded demonstration data — not live intelligence" className="border-dashed">
      DEMO DATA
    </Chip>
  );
}
