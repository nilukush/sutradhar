import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site";

describe("site identity (toolchain smoke)", () => {
  it("exposes the Sutradhar identity constants", () => {
    expect(SITE.name).toBe("Sutradhar");
    expect(SITE.tagline).toMatch(/India/i);
    expect(SITE.url.startsWith("https://")).toBe(true);
  });

  it("keeps the canonical one-liner stable (entity consistency)", () => {
    expect(SITE.oneLiner).toBe(
      "Sutradhar — the aggregator of Indian engineering blogs.",
    );
  });
});
