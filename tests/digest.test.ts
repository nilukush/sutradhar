import { describe, expect, it } from "vitest";
import { isoWeek, digestId, buildWeeklyDigests } from "@/lib/digest";
import type { Article } from "@/lib/schema";

function article(publishedAt: string): Article {
  return {
    id: publishedAt.replace(/\W/g, "").slice(0, 16).padEnd(16, "0"),
    title: `Story ${publishedAt}`,
    url: `https://example.com/${publishedAt}`,
    sourceId: "test",
    publishedAt,
    excerpt: "excerpt",
    topics: ["engineering"],
    authors: [],
  };
}

describe("isoWeek", () => {
  it("computes ISO-8601 week numbers (Thursday rule)", () => {
    expect(isoWeek("2026-01-01T00:00:00.000Z")).toEqual({ year: 2026, week: 1 }); // Thursday
    expect(isoWeek("2026-08-19T00:00:00.000Z")).toEqual({ year: 2026, week: 34 }); // Wednesday
    expect(isoWeek("2027-01-01T00:00:00.000Z")).toEqual({ year: 2026, week: 53 }); // Friday → prev year W53
    expect(isoWeek("2024-12-30T00:00:00.000Z")).toEqual({ year: 2025, week: 1 }); // Monday → next year W01
  });

  it("treats Sunday as day 7 — Sunday belongs to the week that is ending, not starting (regression: verifier H2)", () => {
    expect(isoWeek("2026-08-16T00:00:00.000Z")).toEqual({ year: 2026, week: 33 }); // Sunday of W33
    expect(isoWeek("2026-08-09T00:00:00.000Z")).toEqual({ year: 2026, week: 32 }); // Sunday of W32
  });
});

describe("digestId", () => {
  it("formats as <year>-W<ww>", () => {
    expect(digestId("2026-08-19T00:00:00.000Z")).toBe("2026-W34");
    expect(digestId("2027-01-01T00:00:00.000Z")).toBe("2026-W53");
  });
});

describe("buildWeeklyDigests", () => {
  it("buckets articles into week digests keyed by iso week", () => {
    const digests = buildWeeklyDigests([
      article("2026-08-17T00:00:00.000Z"), // W34
      article("2026-08-19T00:00:00.000Z"), // W34
      article("2026-08-12T00:00:00.000Z"), // W33
    ]);
    expect(digests.map((d) => d.id)).toEqual(["2026-W34", "2026-W33"]);
    expect(digests[0]!.articles).toHaveLength(2);
  });

  it("returns digests newest-first with week boundaries", () => {
    const digests = buildWeeklyDigests([article("2026-08-11T00:00:00.000Z")]);
    const d = digests[0]!;
    expect(d.startDate).toBe("2026-08-10"); // Monday
    expect(d.endDate).toBe("2026-08-16"); // Sunday
  });

  it("files a Sunday article into the week that Sunday ends (regression: verifier H2)", () => {
    const digests = buildWeeklyDigests([
      article("2026-08-16T22:00:00.000Z"), // Sunday evening
      article("2026-08-10T08:00:00.000Z"), // Monday morning
    ]);
    expect(digests).toHaveLength(1);
    expect(digests[0]!.id).toBe("2026-W33");
    expect(digests[0]!.startDate).toBe("2026-08-10");
    expect(digests[0]!.endDate).toBe("2026-08-16");
  });

  it("skips weeks with no articles", () => {
    expect(buildWeeklyDigests([])).toEqual([]);
  });
});
