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
import { articleSlug } from "../src/lib/read";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const dist = resolve(root, "dist");

const corpus = JSON.parse(readFileSync(resolve(root, "src/data/articles.json"), "utf8")) as {
  generatedAt: string;
  articles: { sourceId: string; publishedAt: string; topics?: string[] }[];
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
  "search/index.html",
  "404.html",
  "rss.xml",
  "feed.json",
  "robots.txt",
  "llms.txt",
  "sitemap-index.xml",
  "pagefind/pagefind.js",
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

// Read-page + pagination + sitemap samples (audit C1–C5 regression guards).
const readArticle = corpus.articles.find((a) => (limitById.get(a.sourceId) ?? 400) !== 0);
if (!readArticle) throw new Error("corpus has no eligible read articles");
const readHtml = readFileSync(resolve(dist, "read", articleSlug(readArticle), "index.html"), "utf8");
const articles2 = readFileSync(resolve(dist, "articles/2/index.html"), "utf8");
const sitemapXml = readFileSync(resolve(dist, "sitemap-0.xml"), "utf8");
const readLoc = `${SITE.url}/read/${articleSlug(readArticle)}`;
const lastmodMatch = sitemapXml.match(new RegExp(`<loc>${readLoc.replaceAll(".", "\\.")}</loc><lastmod>([^<]+)</lastmod>`));
const lastmodIsPublishDate =
  !!lastmodMatch && Math.abs(new Date(lastmodMatch[1]).getTime() - new Date(readArticle.publishedAt).getTime()) < 1000;

// Hub pagination is data-aware: only expect page 2 where the corpus warrants it.
const HUB_PAGE_SIZE = 48;
const topicCounts = new Map<string, number>();
const sourceCounts = new Map<string, number>();
for (const a of corpus.articles) {
  for (const t of a.topics ?? []) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) ?? 0) + 1);
}
const topTopic = [...topicCounts.entries()].sort((x, y) => y[1] - x[1])[0];
const topSource = [...sourceCounts.entries()].sort((x, y) => y[1] - x[1])[0];
const topicPage2 = topTopic && topTopic[1] > HUB_PAGE_SIZE ? existsSync(resolve(dist, "topics", topTopic[0], "2", "index.html")) : true;
const sourcePage2 = topSource && topSource[1] > HUB_PAGE_SIZE ? existsSync(resolve(dist, "sources", topSource[0], "2", "index.html")) : true;

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
  ["newsletter subscribes via inline form (or a working fallback)", newsletter.includes('action="/api/subscribe"') || newsletter.includes('href="https://sutradhar.beehiiv.com"') || newsletter.includes('method="get" action="https://github.com')],
  ["no TODO-OWNER link in home", !home.includes('href="https://github.com/TODO-OWNER')],
  ["og image asset is built", existsSync(resolve(dist, "og-default.png"))],
  ["home has og:image and a large twitter card", home.includes('property="og:image"') && home.includes('content="summary_large_image"')],
  ["read page NewsArticle cites the original (isBasedOn)", readHtml.includes('"@type":"NewsArticle"') && readHtml.includes('"isBasedOn"')],
  ["read page NewsArticle carries image and dateModified", readHtml.includes('"image"') && readHtml.includes('"dateModified"')],
  ["read page has BreadcrumbList", readHtml.includes('"@type":"BreadcrumbList"')],
  ["read page is og:type article with published time", readHtml.includes('property="og:type" content="article"') && readHtml.includes('property="article:published_time"')],
  ["/articles ItemList links to in-site read pages", articles2.includes(`"url":"${SITE.url}/read/`)],
  ["page-2 meta description is differentiated", /name="description" content="[^"]*page 2/.test(articles2)],
  ["sitemap read-page lastmod is the article publish date, not build time", lastmodIsPublishDate],
  ["rss declares atom self link", rss.includes('atom:link') && rss.includes('rel="self"')],
  ["rss has lastBuildDate", rss.includes("<lastBuildDate>")],
  ["llms.txt links the publisher policy", readFileSync(resolve(dist, "llms.txt"), "utf8").includes("/publishers")],
  ["robots welcomes Perplexity-User", readFileSync(resolve(dist, "robots.txt"), "utf8").includes("Perplexity-User")],
  ["topic hubs paginate when the corpus warrants it", topicPage2],
  ["source hubs paginate when the corpus warrants it", sourcePage2],
  ["card titles use h2 on grids that follow the h1 directly", articles2.includes('<h2 class="card-title')],
  ["home declares a SearchAction pointing at /search", home.includes("SearchAction") && home.includes("/search?q=")],
  ["search page renders a search input", readFileSync(resolve(dist, "search/index.html"), "utf8").includes('type="search"')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error("✗ SEO checks failed:\n  " + failed.map(([name]) => name).join("\n  "));
  process.exit(1);
}

console.log(`✓ ${required.length} required routes + ${readCount} reading pages present, SEO checks passed`);
