/** Small record fixtures for page and helper tests. */

import type { EntityEventOut, EntityOut, Milestone, RegulationOut } from "../lib/types";

export function makeLaw(
  slug: string,
  name: string,
  opts: {
    status?: string;
    milestones?: Milestone[];
    superseded_by?: string | null;
    code?: string;
    events?: Partial<EntityEventOut>[];
    verified?: string;
  } = {},
): EntityOut {
  const regulation: RegulationOut = {
    government_level: "state", status: opts.status ?? "effective", status_label: null,
    introduced_at: null, passed_at: null, signed_at: null, effective_at: null,
    compliance_deadline: null, last_amended_at: null, enforcement_authority: null,
    penalties: null, covered_entities: null, risk_classification: null,
    applicability_notes: null, official_source_url: `https://example.gov/${slug}`,
    confidence: "high", last_verified_at: opts.verified ?? "2026-11-25T00:00:00",
    curated_confidence: "high", confidence_notes: [], milestones: opts.milestones ?? [],
    superseded_by: opts.superseded_by ?? null,
  };
  return {
    id: slug.length, slug, name, entity_type: "regulation", jurisdiction_code: opts.code ?? "US-CO",
    description: null, official_url: null, current_status: regulation.status, needs_review: false,
    is_demo: false, regulation, standard: null,
    events: (opts.events ?? []).map((e, i) => ({
      id: i + 1, event_type: "note", occurred_at: "2026-11-19T00:00:00", previous_value: null,
      new_value: null, summary: "Something changed", impact_score: null, evidence_item_id: null, ...e,
    })),
  };
}
