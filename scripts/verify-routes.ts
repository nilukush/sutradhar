/**
 * Post-build route inventory check (CI gate for the site layer).
 * Verifies the pages that must exist for SEO/GEO coverage actually built.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES } from "../src/data/sources";
import { WINDOW_H } from "../src/lib/trending";
import { SITE } from "../src/lib/site";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const dist = resolve(root, "dist");

const corpus = JSON.parse(readFileSync(resolve(root, "src/data/articles.json"), "utf8")) as {
  generatedAt: string;
  articles: { sourceId: string; publishedAt: string }[];
};
const sourceIds = [...new Set(corpus.articles.map((a) => a.sourceId))];
const limitById = new Map(SOURCES.map((s) => [s.id, s.excerptLimit]));

const required: string[] = [
  "index.html",
  "articles/index.html",
  "articles/2/index.html",
  "topics/index.html",
  "topics/backend/index.html",
  "sources/index.html",
  "digest/index.html",
  "about/index.html",
  "newsletter/index.html",
  "publishers/index.html",
  "404.html",
  "rss.xml",
  "feed.json",
  "robots.txt",
  "llms.txt",
  "sitemap-index.xml",
  ...sourceIds.map((id) => `sources/${id}/index.html`),
];

const missing = required.filter((p) => !existsSync(resolve(dist, p)));
if (missing.length > 0) {
  console.error("✗ missing routes:\n  " + missing.join("\n  "));
  process.exit(1);
}

// Every eligible article must have its in-site reading page (opted-out
// sources with excerptLimit 0 legitimately have none).
const expectedRead = corpus.articles.filter((a) => (limitById.get(a.sourceId) ?? 400) !== 0).length;
const readCount = readdirSync(resolve(dist, "read"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => existsSync(resolve(dist, "read", d.name, "index.html"))).length;
if (readCount < expectedRead) {
  console.error(`✗ reading pages incomplete: ${readCount}/${expectedRead}`);
  process.exit(1);
}

// SEO spot checks on generated HTML
const home = readFileSync(resolve(dist, "index.html"), "utf8");
const rss = readFileSync(resolve(dist, "rss.xml"), "utf8");
const newsletter = readFileSync(resolve(dist, "newsletter/index.html"), "utf8");

// Trending section renders only when articles exist inside the eligibility
// window — mirror that eligibility here so the check is data-aware, not
// unconditional. (Math.MIN over ages = the NEWEST article's age; max would be
// the oldest.) WINDOW_H is imported from the lib so the two cannot drift.
const generatedAt = new Date(corpus.generatedAt).getTime();
const newestAgeH =
  corpus.articles.length > 0
    ? Math.min(...corpus.articles.map((a) => (generatedAt - new Date(a.publishedAt).getTime()) / 3_600_000))
    : Number.POSITIVE_INFINITY;
const trendingEligible = newestAgeH <= WINDOW_H;

const checks: [string, boolean][] = [
  ["home has canonical", home.includes('rel="canonical"')],
  ["home has JSON-LD", home.includes("application/ld+json")],
  ["home has CollectionPage", home.includes("CollectionPage")],
  [
    trendingEligible ? "home has trending section (fresh corpus)" : "trending correctly absent (no articles in window)",
    trendingEligible ? home.includes("Gaining momentum") : !home.includes("Gaining momentum"),
  ],
  ["robots allows GPTBot", readFileSync(resolve(dist, "robots.txt"), "utf8").includes("GPTBot")],
  ["llms.txt lists sources", readFileSync(resolve(dist, "llms.txt"), "utf8").includes("## Sources")],
  ["rss links are absolute", rss.includes(`${SITE.url}/read/`)],
  ["rss links match slashless canonicals", !new RegExp(`<link>${SITE.url.replaceAll(".", "\\.")}/read/[^<]+/</link>`).test(rss)],
  ["newsletter subscribes via beehiiv (or a working fallback)", newsletter.includes('href="https://sutradhar.beehiiv.com"') || newsletter.includes('method="get" action="https://github.com') || newsletter.includes('class="button" href="/rss.xml"')],
  ["no TODO-OWNER link in home", !home.includes('href="https://github.com/TODO-OWNER')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error("✗ SEO checks failed:\n  " + failed.map(([name]) => name).join("\n  "));
  process.exit(1);
}

console.log(`✓ ${required.length} required routes + ${readCount} reading pages present, SEO checks passed`);
