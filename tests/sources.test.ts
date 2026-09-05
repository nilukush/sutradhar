import { describe, expect, it } from "vitest";
import { SOURCES } from "@/data/sources";
import { SourceSchema } from "@/lib/schema";

describe("source registry", () => {
  it("has every entry valid against the Source schema (CI guard for bad additions)", () => {
    for (const s of SOURCES) {
      const parsed = SourceSchema.safeParse(s);
      if (!parsed.success) {
        throw new Error(`Invalid source "${s.id}": ${JSON.stringify(parsed.error.issues)}`);
      }
    }
  });

  it("has unique ids", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the launch set required by the analysis", () => {
    const required = [
      "phonepe", "razorpay", "flipkart", "swiggy", "meesho", "groww",
      "cred", "jiohotstar", "freshworks", "walmart-global-tech",
      "browserstack", "wingify",
    ];
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const r of required) expect(ids.has(r), `missing source ${r}`).toBe(true);
  });

  it("covers meesho via a ghost adapter with url rewrite to the public blog", () => {
    const meesho = SOURCES.find((s) => s.id === "meesho");
    expect(meesho?.feed.type).toBe("ghost");
    if (meesho?.feed.type === "ghost") {
      expect(meesho.feed.ghostKey.length).toBeGreaterThan(8);
      expect(meesho.feed.urlRewrite?.[1]).toBe("https://www.meesho.io/blog/");
    }
  });

  it("tracks swiggy via the Swiggy Bytes publication feed, not the tag feed", () => {
    const swiggy = SOURCES.find((s) => s.id === "swiggy");
    expect(swiggy?.siteUrl).toBe("https://medium.com/swiggy-bytes");
    if (swiggy?.feed.type === "rss") {
      expect(swiggy.feed.url).toBe("https://medium.com/feed/swiggy-bytes");
    }
    // The tag feed aggregated third-party interview-prep/PM posts — keep it out.
    expect(JSON.stringify(swiggy?.feed)).not.toContain("/feed/tag/");
  });

  it("applies engineering-only category exclusions to mixed-content feeds", () => {
    const denylistOf = (id: string): string[] | undefined => {
      const s = SOURCES.find((x) => x.id === id);
      return s && (s.feed.type === "rss" || s.feed.type === "atom") ? s.feed.excludeCategories : undefined;
    };
    expect(denylistOf("browserstack")).toContain("Newsletter");
    expect(denylistOf("phonepe")).toEqual(expect.arrayContaining(["Product", "People Stories"]));
    expect(denylistOf("jupiter")).toEqual(expect.arrayContaining(["product-design", "ux", "ui"]));
    // Mixed + effectively no engineering output → dormant (display flag).
    expect(SOURCES.find((s) => s.id === "jupiter")?.dormant).toBe(true);
  });
});
