import { describe, expect, it } from "vitest";
import { withReadPageLastmod } from "@/lib/sitemap";
import { articleSlug } from "@/lib/read";

const SITE_URL = "https://sutradhar.nilukush.workers.dev";

const article = {
  id: "3586caf2e710c201",
  title: "Zero to 150Mn+ Users in 3 years!",
  publishedAt: "2026-08-20T04:15:00.000Z",
};

describe("withReadPageLastmod (sitemap serialize)", () => {
  const serialize = withReadPageLastmod([article]);

  it("stamps /read/ URLs with the article's publishedAt, not build time", () => {
    const item = serialize({ url: `${SITE_URL}/read/${articleSlug(article)}`, lastmod: new Date("2026-08-28T00:00:00Z") });
    expect(new Date(item.lastmod as string).toISOString()).toBe(article.publishedAt);
  });

  it("matches slashless URLs (the canonical form used across the site)", () => {
    const slug = articleSlug(article);
    expect(`${SITE_URL}/read/${slug}`).not.toMatch(/\/$/); // precondition: helper input is slashless
    const item = serialize({ url: `${SITE_URL}/read/${slug}`, lastmod: new Date() });
    expect(new Date(item.lastmod as string).toISOString()).toBe(article.publishedAt);
  });

  it("leaves non-read URLs (hubs, home) on the build-time lastmod", () => {
    const buildTime = new Date("2026-08-28T00:00:00Z");
    const item = serialize({ url: `${SITE_URL}/articles`, lastmod: buildTime });
    expect(new Date(item.lastmod as string)).toEqual(buildTime);
  });

  it("is tolerant of a trailing slash in the URL (defensive)", () => {
    const item = serialize({ url: `${SITE_URL}/read/${articleSlug(article)}/`, lastmod: new Date() });
    expect(new Date(item.lastmod as string).toISOString()).toBe(article.publishedAt);
  });
});
