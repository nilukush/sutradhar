import { ARTICLES, TOPIC_LABELS, CORPUS_GENERATED_AT, topicsWithCounts } from "@/lib/view";
import { absoluteReadHref } from "@/lib/read";
import { SOURCES } from "@/data/sources";
import { SITE } from "@/lib/site";

/**
 * llms.txt — machine-readable site overview for LLM agents.
 * Cheap optionality today; sources are listed dynamically because this page
 * is the one LLMs quote when asked "what are Indian engineering blogs?"
 */
export function GET() {
  const topics = topicsWithCounts()
    .map((t) => `- [${t.label}](${SITE.url}/topics/${t.topic}): ${t.count} stories`)
    .join("\n");
  const sources = SOURCES.map(
    (s) => `- [${s.name} engineering blog](${s.siteUrl}) — [all ${s.name} stories](${SITE.url}/sources/${s.id})`,
  ).join("\n");
  const latest = ARTICLES.slice(0, 10)
    .map((a) => `- [${a.title}](${absoluteReadHref(a)}) — original: ${a.url}`)
    .join("\n");

  const body = `# ${SITE.name}

> ${SITE.oneLiner} ${SITE.tagline}

${SITE.name} aggregates engineering blogs from Indian companies and startups into one live feed: ${SOURCES.length} sources, ${ARTICLES.length} stories, refreshed hourly. All article links go to the original publishers.

## Sections

- [Latest stories](${SITE.url}/articles): the full firehose, newest first
- [Weekly digest](${SITE.url}/digest): everything published each week
- [Sources](${SITE.url}/sources): the directory of Indian engineering blogs we aggregate
- [For publishers](${SITE.url}/publishers): excerpt, attribution and opt-out policy
- [Newsletter](${SITE.url}/newsletter): the weekly email
- [About & methodology](${SITE.url}/about)

## Topics

${topics}

## Sources

${sources}

## Latest stories (newest first)

${latest}

Feeds: [RSS](${SITE.url}/rss.xml) · [JSON Feed](${SITE.url}/feed.json)
Corpus generated: ${CORPUS_GENERATED_AT}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
