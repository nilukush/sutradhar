// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Canonical production origin — must match src/lib/site.ts. Override with
// SITE_URL (e.g. https://sutradhar.dev once the domain is registered).
const SITE_URL = process.env.SITE_URL ?? "https://sutradhar.nilukush.workers.dev";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  integrations: [
    sitemap({
      // lastmod only on genuine content change (Google treats it as a binary trust signal);
      // builds only happen when data changes, so build-time "now" is honest here.
      lastmod: new Date(),
      changefreq: "hourly",
      priority: 0.7,
      filter: (page) => !page.includes("/404"),
    }),
  ],
  build: {
    format: "directory",
  },
});
