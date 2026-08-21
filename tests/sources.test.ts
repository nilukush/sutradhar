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
});
