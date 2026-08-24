import { describe, expect, it } from "vitest";
import { subscribeAction, subscribeOptions, isRepoConfigured } from "@/lib/subscribe";

describe("subscribe config (provider switch is config-only)", () => {
  it("defaults to the GitHub issue-form flow when no provider is set up", () => {
    const options = subscribeOptions();
    expect(options.provider).toBe("github-issue");
    expect(options.action).toContain("/issues/new");
    expect(options.method).toBe("get");
    expect(options.fields.title).toBe("Subscribe request");
    expect(options.fields.labels).toBe("subscribe");
  });

  it("builds a pre-filled issue body carrying the entered email", () => {
    const body = subscribeAction().buildBody("dev@example.in");
    expect(body).toContain("dev@example.in");
  });

  it("always exposes the RSS fallback regardless of provider", () => {
    expect(subscribeOptions().fallbacks.rss).toBe("/rss.xml");
  });

  it("switches to a beehiiv hosted page with a plain link", () => {
    const options = subscribeOptions({ provider: "beehiiv-hosted", beehiivUrl: "https://www.beehiiv.com/subscribe/x" });
    expect(options.provider).toBe("beehiiv-hosted");
    expect(options.href).toBe("https://www.beehiiv.com/subscribe/x");
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
