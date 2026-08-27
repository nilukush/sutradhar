import { describe, expect, it, vi, afterEach } from "vitest";
import { subscribeAction, subscribeOptions, isRepoConfigured } from "@/lib/subscribe";

afterEach(() => vi.unstubAllEnvs());

describe("subscribe config (provider switch is config-only)", () => {
  it("defaults to the inline api-form on our own Worker endpoint", () => {
    const options = subscribeOptions();
    expect(options.provider).toBe("api-form");
    expect(options.method).toBe("post");
    expect(options.action).toBe("/api/subscribe");
  });

  it("SUBSCRIBE_PROVIDER=beehiiv-embed activates the inline beehiiv iframe form", () => {
    vi.stubEnv("SUBSCRIBE_PROVIDER", "beehiiv-embed");
    vi.stubEnv("BEEHIIV_EMBED_URL", "https://subscribe-forms.beehiiv.com/959170e9-d626-4fb5-8616-c135e5dbf694");
    const options = subscribeOptions();
    expect(options.provider).toBe("beehiiv-embed");
    expect(options.method).toBe("embed");
    expect(options.embedUrl).toBe("https://subscribe-forms.beehiiv.com/959170e9-d626-4fb5-8616-c135e5dbf694");
  });

  it("SUBSCRIBE_PROVIDER=beehiiv-hosted links to our publication page", () => {
    vi.stubEnv("SUBSCRIBE_PROVIDER", "beehiiv-hosted");
    const options = subscribeOptions();
    expect(options.provider).toBe("beehiiv-hosted");
    expect(options.method).toBe("link");
    expect(options.href).toBe("https://sutradhar.beehiiv.com");
  });

  it("SUBSCRIBE_PROVIDER=github-issue restores the zero-config GitHub form", () => {
    vi.stubEnv("SUBSCRIBE_PROVIDER", "github-issue");
    const options = subscribeOptions();
    expect(options.provider).toBe("github-issue");
    expect(options.method).toBe("get");
    expect(options.action).toContain("/issues/new");
    expect(options.fields.title).toBe("Subscribe request");
    expect(options.fields.template).toBe("subscribe.md");
  });

  it("an explicit override always wins over env config", () => {
    vi.stubEnv("SUBSCRIBE_PROVIDER", "github-issue");
    const options = subscribeOptions({ provider: "beehiiv-hosted", beehiivUrl: "https://x.beehiiv.com" });
    expect(options.provider).toBe("beehiiv-hosted");
    expect(options.href).toBe("https://x.beehiiv.com");
  });

  it("always exposes the RSS fallback regardless of provider", () => {
    expect(subscribeOptions().fallbacks.rss).toBe("/rss.xml");
  });

  it("builds a pre-filled GitHub issue body (fallback provider helper)", () => {
    expect(subscribeAction().buildBody("dev@example.in")).toContain("dev@example.in");
  });
});

describe("isRepoConfigured", () => {
  it("accepts the real repo and rejects placeholders", () => {
    expect(isRepoConfigured("https://github.com/TODO-OWNER/sutradhar")).toBe(false);
    expect(isRepoConfigured("https://github.com/nilukush/sutradhar")).toBe(true);
  });
});
