import { describe, expect, it, vi, afterEach } from "vitest";
import { subscribeAction, subscribeOptions, isRepoConfigured } from "@/lib/subscribe";

afterEach(() => vi.unstubAllEnvs());

describe("subscribe config (provider switch is config-only)", () => {
  it("defaults to the beehiiv hosted page (our publication, baked in)", () => {
    const options = subscribeOptions();
    expect(options.provider).toBe("beehiiv-hosted");
    expect(options.method).toBe("link");
    expect(options.href).toBe("https://sutradhar.beehiiv.com");
  });

  it("BEEHIIV_URL can override the publication at build time", () => {
    vi.stubEnv("BEEHIIV_URL", "https://other.beehiiv.com");
    expect(subscribeOptions().href).toBe("https://other.beehiiv.com");
  });

  it("falls back to the GitHub issue-form flow when BEEHIIV_URL is explicitly emptied", () => {
    vi.stubEnv("BEEHIIV_URL", "");
    const options = subscribeOptions();
    expect(options.provider).toBe("github-issue");
    expect(options.action).toContain("/issues/new");
    expect(options.method).toBe("get");
    expect(options.fields.title).toBe("Subscribe request");
    expect(options.fields.template).toBe("subscribe.md");
  });

  it("builds a pre-filled issue body carrying the entered email", () => {
    const body = subscribeAction().buildBody("dev@example.in");
    expect(body).toContain("dev@example.in");
  });

  it("always exposes the RSS fallback regardless of provider", () => {
    expect(subscribeOptions().fallbacks.rss).toBe("/rss.xml");
  });

  it("an explicit beehiiv override wins even without env config", () => {
    const options = subscribeOptions({ provider: "beehiiv-hosted", beehiivUrl: "https://x.beehiiv.com" });
    expect(options.provider).toBe("beehiiv-hosted");
    expect(options.href).toBe("https://x.beehiiv.com");
    expect(options.method).toBe("link");
  });
});

describe("isRepoConfigured", () => {
  it("is false while the repo url still carries the TODO placeholder", () => {
    expect(isRepoConfigured("https://github.com/TODO-OWNER/sutradhar")).toBe(false);
  });
  it("is true for a real owner", () => {
    expect(isRepoConfigured("https://github.com/nilesh/sutradhar")).toBe(true);
  });
});
