// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import corpus from "./src/data/articles.json";
import { withReadPageLastmod } from "./src/lib/sitemap.ts";

// Canonical production origin — must match src/lib/site.ts. The Workers URL
// is the permanent home (no custom domain; owner decision 2026-08-24).
const SITE_URL = process.env.SITE_URL ?? "https://sutradhar.nilukush.workers.dev";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  integrations: [
    sitemap({
      // lastmod only on genuine content change (Google treats it as a binary trust signal).
      // Hubs change whenever the corpus does (builds only fire on data change), so
      // build-time "now" is honest there; immutable /read pages instead carry the
      // article's publishedAt via serialize (SEO-GEO-AUDIT C3). changefreq/priority
      // are omitted — Google documents that it ignores both.
      lastmod: new Date(),
      filter: (page) => !page.includes("/404"),
      serialize: withReadPageLastmod(corpus.articles),
    }),
  ],
  build: {
    format: "directory",
  },
});
