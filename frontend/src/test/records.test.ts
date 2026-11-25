/** Record helpers read curated fields and timeline events only. */

import { describe, expect, it } from "vitest";

import { latestChange } from "../lib/records";
import type { EntityEventOut, EntityOut } from "../lib/types";

const event = (occurred_at: string): EntityEventOut => ({
  id: Math.random(), event_type: "note", occurred_at, previous_value: null,
  new_value: null, summary: "x", impact_score: null, evidence_item_id: null,
});

const entity = (events: EntityEventOut[]): EntityOut => ({
  id: 1, slug: "brazil-pl-2338", name: "Brazil AI Bill", entity_type: "regulation",
  jurisdiction_code: "BR", description: null, official_url: null, current_status: "introduced",
  needs_review: false, is_demo: false, regulation: null, standard: null, events,
});

describe("latestChange", () => {
  it("is the newest timeline event, not the introduction date", () => {
    // Brazil: introduced 3 May 2023, timeline runs to 20 May 2025 (T-042 b).
    const e = entity([event("2025-05-20T00:00:00"), event("2023-05-03T00:00:00"), event("2024-12-10T00:00:00")]);
    expect(latestChange(e)).toBe("2025-05-20T00:00:00");
  });
  it("is null for a record with no events", () => {
    expect(latestChange(entity([]))).toBeNull();
  });
});
