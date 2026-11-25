/** Timestamp handling: naive API timestamps are UTC; calendar dates never shift a day. */

import { describe, expect, it } from "vitest";

import { absDate, dateColumn, daysUntil, parseTimestamp, utcStamp } from "../lib/format";

describe("parseTimestamp", () => {
  it("reads offset-less API timestamps as UTC", () => {
    expect(parseTimestamp("2026-09-23T22:33:00").toISOString()).toBe("2026-09-23T22:33:00.000Z");
  });
  it("respects explicit offsets", () => {
    expect(parseTimestamp("2026-09-23T00:57:57+00:00").toISOString()).toBe("2026-09-23T00:57:57.000Z");
    expect(parseTimestamp("2026-09-23T02:00:00+02:00").toISOString()).toBe("2026-09-23T00:00:00.000Z");
    expect(parseTimestamp("2026-09-23T00:00:00Z").toISOString()).toBe("2026-09-23T00:00:00.000Z");
  });
  it("leaves date-only strings alone", () => {
    expect(parseTimestamp("2026-06-30").toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });
});

describe("date display", () => {
  it("shows a UTC-midnight calendar date as that day in any timezone", () => {
    expect(absDate("2026-06-30T00:00:00")).toBe("30 Jun 2026");
  });
});

describe("absolute dates (DESIGN_SYSTEM.md §8)", () => {
  const now = new Date("2026-11-25T15:13:00Z");
  it("formats running-text dates, data stamps and mono columns", () => {
    expect(absDate("2027-01-01")).toBe("1 Jan 2027");
    expect(utcStamp("2026-11-25T15:13:41")).toBe("25 NOV 2026 15:13Z");
    expect(dateColumn("2026-12-02", now)).toEqual({ day: "02 DEC", year: null });
    expect(dateColumn("2027-08-02", now)).toEqual({ day: "02 AUG", year: "2027" });
  });
  it("counts whole UTC days to a calendar date", () => {
    expect(daysUntil("2026-12-02", now)).toBe(7);
    expect(daysUntil("2027-01-01", now)).toBe(37);
    expect(daysUntil("2026-11-25", now)).toBe(0);
    expect(daysUntil("2026-11-24", now)).toBe(-1);
  });
});
