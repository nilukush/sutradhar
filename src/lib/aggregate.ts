import { articleId, canonicalUrl, excerptFrom, htmlToText } from "@/lib/normalize";
import { TOPICS, type Article, type Source, type Topic } from "@/lib/schema";
import type { RawItem } from "@/lib/feeds";

const TOPIC_SET = new Set<string>(TOPICS);

/** Keyword signals for topic inference over "title + excerpt". */
const TOPIC_KEYWORDS: ReadonlyArray<readonly [Topic, RegExp]> = [
  ["ai-ml", /\b(ml|machine learning|llm|genai|generative ai|deep learning|recommendation|inference|model training)\b/i],
  ["data-science", /\b(data science|analytics|experiment|dashboard|data pipeline|warehouse|spark|sql)\b/i],
  ["backend", /\b(backend|microservice|api|kafka|queue|database|latency|throughput)\b/i],
  ["frontend", /\b(frontend|front-end|react|vue|css|javascript|browser|web performance)\b/i],
  ["mobile", /\b(android|ios|flutter|react native|mobile app|apk)\b/i],
  ["infrastructure", /\b(infrastructure|cloud|kubernetes|k8s|terraform|compute|network)\b/i],
  ["devops-sre", /\b(devops|sre|observability|monitoring|reliability|incident|on-call|ci\/cd|deployment)\b/i],
  ["security", /\b(security|fraud|risk|vulnerability|encryption|authentication)\b/i],
  ["fintech-payments", /\b(payment|payments|upi|lending|fintech|checkout|transaction|insurance|credit)\b/i],
  ["scale", /\b(scale|scaling|billion|million|high traffic|horizontal|sharding)\b/i],
  ["platform", /\b(platform|framework|tooling|build system|monorepo|sdk|library)\b/i],
  ["culture", /\b(culture|hiring|team|career|engineering management|internship|interview)\b/i],
  ["product-engineering", /\b(product|growth|experimentation|a\/b)\b/i],
];

const MAX_TOPICS = 5;

/** Union of source defaults, recognized feed categories and title/excerpt keyword matches. */
export function inferTopics(source: Source, item: RawItem): Topic[] {
  const out: Topic[] = [];
  const add = (t: Topic) => {
    if (!out.includes(t)) out.push(t);
  };
  for (const t of source.topics) add(t);
  for (const c of item.categories) {
    const normalized = c.toLowerCase().trim().replace(/\s+/g, "-");
    if (TOPIC_SET.has(normalized)) add(normalized as Topic);
  }
  const haystack = `${item.title} ${item.excerpt ?? ""}`;
  for (const [topic, re] of TOPIC_KEYWORDS) {
    if (out.length >= MAX_TOPICS) break;
    if (re.test(haystack)) add(topic);
  }
  return out.slice(0, MAX_TOPICS);
}

/** RawItem → Article. Returns null when the item lacks url/title/date (non-fatal skip). */
export function toArticle(source: Source, item: RawItem): Article | null {
  if (!item.title || item.title.trim().length < 3) return null;
  let url: string;
  try {
    url = canonicalUrl(item.url);
  } catch {
    return null;
  }
  if (!/^https?:\/\/.+\./.test(url)) return null;
  if (!item.publishedAt) return null;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return null;

  const excerpt = excerptFrom(
    htmlToText(item.excerpt || item.contentHtml || ""),
    280,
  );
  // Extended excerpt for the in-site reading page — an excerpt, never full text.
  const content = excerptFrom(htmlToText(item.contentHtml || item.excerpt || ""), 1200);

  return {
    id: articleId(url),
    title: item.title.trim().slice(0, 300),
    url,
    sourceId: source.id,
    publishedAt: date.toISOString(),
    excerpt: excerpt.slice(0, 400),
    content: content.slice(0, 1600),
    topics: inferTopics(source, item),
    authors: item.authors.slice(0, 4),
  };
}

export interface MergeResult {
  articles: Article[];
  changed: boolean;
}

/**
 * Merge freshly parsed articles into the existing corpus: dedupe by canonical
 * url id, prefer the fresh version (updates excerpt/topics), sort newest-first,
 * cap the corpus keeping the newest.
 */
export function mergeArticles(
  existing: Article[],
  incoming: Article[],
  opts: { maxArticles?: number } = {},
): MergeResult {
  const max = opts.maxArticles ?? 2000;
  const byId = new Map<string, Article>();
  for (const a of existing) byId.set(a.id, a);
  for (const a of incoming) byId.set(a.id, a);

  const articles = [...byId.values()]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.id.localeCompare(b.id)))
    .slice(0, max);

  // Content-aware change key: id-only keys would never persist edits to already-stored
  // articles (title/excerpt/topic fixes would silently no-op the write).
  const key = (list: Article[]) =>
    list.map((a) => `${a.id}:${a.title}:${a.excerpt}:${a.content}:${a.topics.join("+")}:${a.publishedAt}`).join(",");
  return { articles, changed: key(articles) !== key(existing) };
}
