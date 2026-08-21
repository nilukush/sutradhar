/**
 * Post-build route inventory check (CI gate for the site layer).
 * Verifies the pages that must exist for SEO/GEO coverage actually built.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const dist = resolve(root, "dist");

const corpus = JSON.parse(readFileSync(resolve(root, "src/data/articles.json"), "utf8")) as {
  articles: { sourceId: string }[];
};
const sourceIds = [...new Set(corpus.articles.map((a) => a.sourceId))];

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

// SEO spot checks on generated HTML
const home = readFileSync(resolve(dist, "index.html"), "utf8");
const checks: [string, boolean][] = [
  ["home has canonical", home.includes('rel="canonical"')],
  ["home has JSON-LD", home.includes("application/ld+json")],
  ["home has CollectionPage", home.includes("CollectionPage")],
  ["robots allows GPTBot", readFileSync(resolve(dist, "robots.txt"), "utf8").includes("GPTBot")],
  ["llms.txt lists sources", readFileSync(resolve(dist, "llms.txt"), "utf8").includes("## Sources")],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error("✗ SEO checks failed:\n  " + failed.map(([name]) => name).join("\n  "));
  process.exit(1);
}

console.log(`✓ ${required.length} required routes present, SEO checks passed`);
