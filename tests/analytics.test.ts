import { describe, expect, it, vi, afterEach } from "vitest";
import { beaconSnippet } from "@/lib/analytics";

afterEach(() => vi.unstubAllEnvs());

describe("beaconSnippet (CF Web Analytics, owner decision 2026-09-19)", () => {
  it("returns null for an explicitly empty token, the disable path", () => {
    expect(beaconSnippet("")).toBeNull();
    vi.stubEnv("CF_ANALYTICS_TOKEN", "");
    expect(beaconSnippet()).toBeNull();
  });

  it("returns null for whitespace-only tokens", () => {
    expect(beaconSnippet("   ")).toBeNull();
    expect(beaconSnippet("\t\n")).toBeNull();
  });

  it("defaults to the committed production property when nothing overrides it", () => {
    const snippet = beaconSnippet();
    expect(snippet).not.toBeNull();
    expect(snippet!.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(typeof JSON.parse(snippet!.config).token).toBe("string");
    expect(JSON.parse(snippet!.config).token).toHaveLength(32);
  });

  it("returns the beacon script src plus a data-cf-beacon payload for a valid token", () => {
    const snippet = beaconSnippet("abc123");
    expect(snippet).not.toBeNull();
    expect(snippet!.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(JSON.parse(snippet!.config)).toEqual({ token: "abc123" });
  });

  it("trims surrounding whitespace from the token", () => {
    const snippet = beaconSnippet("  abc123  ");
    expect(JSON.parse(snippet!.config)).toEqual({ token: "abc123" });
  });

  it("reads CF_ANALYTICS_TOKEN from the environment when no token is passed", () => {
    vi.stubEnv("CF_ANALYTICS_TOKEN", "tok_from_env");
    const snippet = beaconSnippet();
    expect(snippet).not.toBeNull();
    expect(JSON.parse(snippet!.config)).toEqual({ token: "tok_from_env" });
  });

  it("an explicit token argument takes precedence over the environment", () => {
    vi.stubEnv("CF_ANALYTICS_TOKEN", "tok_from_env");
    expect(JSON.parse(beaconSnippet("explicit")!.config)).toEqual({ token: "explicit" });
  });
});
