/** Record helpers read curated fields and timeline events only. */

import { describe, expect, it } from "vitest";

import {
  byStage,
  latestChange,
  nextDates,
  recordsChecked,
  shortName,
  upcomingMilestones,
} from "../lib/records";
import { makeLaw } from "./fixtures";
import type { EntityEventOut, EntityOut, Milestone, RegulationOut } from "../lib/types";

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

const law = (slug: string, milestones: Milestone[], verified = "2026-11-25T00:00:00"): EntityOut => ({
  ...entity([]),
  slug,
  regulation: { milestones, last_verified_at: verified } as unknown as RegulationOut,
});

describe("upcomingMilestones", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  it("lists milestones from today on, soonest first, across laws", () => {
    const eu = law("eu-ai-act", [
      { date: "2026-08-02", kind: "obligations_apply", label: "Past" },
      { date: "2026-12-02", kind: "obligations_apply", label: "Soon" },
    ]);
    const co = law("colorado-sb-26-189", [{ date: "2027-01-01", kind: "takes_effect", label: "Effective" }]);
    const ca = law("california-sb-53", [{ date: "2027-01-01", kind: "deadline", label: "Reports due" }]);
    const rows = upcomingMilestones([co, eu, ca], now);
    expect(rows.map((m) => [m.entity.slug, m.date, m.days])).toEqual([
      ["eu-ai-act", "2026-12-02", 7],
      ["colorado-sb-26-189", "2027-01-01", 37],
      ["california-sb-53", "2027-01-01", 37],
    ]);
  });
});

describe("recordsChecked", () => {
  it("is the oldest check among the laws, due 90 days later", () => {
    const checked = recordsChecked([
      law("a", [], "2026-11-25T00:00:00"),
      law("b", [], "2026-11-20T00:00:00"),
    ]);
    expect(checked?.checked).toBe("2026-11-20T00:00:00");
    expect(checked?.due.slice(0, 10)).toBe("2027-02-18");
  });
  it("is null with no laws", () => {
    expect(recordsChecked([])).toBeNull();
  });
});

describe("Home helpers", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const eu = makeLaw("eu-ai-act", "EU AI Act", {
    milestones: [{ date: "2026-12-02", kind: "obligations_apply", label: "Prohibitions" }],
  });
  const co = makeLaw("colorado-sb-26-189", "Colorado SB 26-189 (Automated Decision-Making Technology)", {
    status: "signed", milestones: [{ date: "2027-01-01", kind: "takes_effect", label: "Takes effect" }],
  });
  const ca = makeLaw("california-sb-53", "California SB 53 (Transparency in Frontier AI Act)", {
    milestones: [{ date: "2027-01-01", kind: "deadline", label: "Reports due" }],
  });
  const ut = makeLaw("utah-ai-policy-act", "Utah AI Policy Act", {
    milestones: [{ date: "2027-07-01", kind: "expires", label: "Repealed unless extended" }],
  });
  const old = makeLaw("colorado-ai-act", "Colorado AI Act (SB 24-205)", {
    status: "amended", superseded_by: "colorado-sb-26-189",
  });
  const br = makeLaw("brazil-pl-2338", "Brazil AI Bill (PL 2338/2023)", { status: "introduced", code: "BR" });

  it("tiles show the next two distinct dates; a tied date names every law on it", () => {
    const [first, second, third] = nextDates(upcomingMilestones([ut, ca, eu, co], now));
    expect(first.map((m) => m.entity.slug)).toEqual(["eu-ai-act"]);
    expect(second.map((m) => m.entity.slug).sort()).toEqual(["california-sb-53", "colorado-sb-26-189"]);
    expect(third).toBeUndefined();
  });

  it("lists laws not yet in force first, superseded last, sooner dates first", () => {
    expect(byStage([old, eu, ut, br, co]).map((e) => e.slug)).toEqual([
      "colorado-sb-26-189", "brazil-pl-2338", "eu-ai-act", "utah-ai-policy-act", "colorado-ai-act",
    ]);
  });

  it("shortens names by dropping a trailing parenthetical", () => {
    expect(shortName(co.name)).toBe("Colorado SB 26-189");
    expect(shortName("EU AI Act")).toBe("EU AI Act");
  });
});
