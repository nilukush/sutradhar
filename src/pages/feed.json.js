import { ARTICLES, sourceOf } from "@/lib/view";
import { articleSlug } from "@/lib/read";
import { SITE } from "@/lib/site";

export function GET() {
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${SITE.name} — ${SITE.shortTagline}`,
    home_page_url: SITE.url,
    feed_url: `${SITE.url}/feed.json`,
    description: SITE.description,
    language: "en-IN",
    items: ARTICLES.slice(0, 60).map((article) => ({
      id: `${SITE.url}/read/${articleSlug(article)}`,
      url: `${SITE.url}/read/${articleSlug(article)}`,
      // JSON Feed native field for the publisher's original article.
      external_url: article.url,
      title: article.title,
      content_text: article.content || article.excerpt,
      date_published: article.publishedAt,
      authors: article.authors.map((name) => ({ name })),
      tags: [sourceOf(article)?.name ?? article.sourceId, ...article.topics],
    })),
  };
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
}
