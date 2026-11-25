/** Timestamp handling: naive API timestamps are UTC; calendar dates never shift a day. */

import { describe, expect, it } from "vitest";

import { parseTimestamp, relativeTime, shortDate } from "../lib/format";

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
    expect(shortDate("2026-06-30T00:00:00")).toBe("Jun 30, 2026");
  });
  it("computes relative time from UTC", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace("Z", "");
    expect(relativeTime(tenMinAgo)).toBe("10m ago");
  });
});
