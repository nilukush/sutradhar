import corpusJson from "@/data/articles.json";
import { SOURCES } from "@/data/sources";
import { CorpusSchema, TOPICS, type Article, type Source, type Topic } from "@/lib/schema";
import { SITE } from "@/lib/site";
import { buildWeeklyDigests, type WeeklyDigest } from "@/lib/digest";

const parsed = CorpusSchema.safeParse(corpusJson);
if (!parsed.success) {
  throw new Error(`articles.json failed schema validation: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`);
}

export const ARTICLES: Article[] = [...parsed.data.articles].sort((a, b) =>
  a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.id.localeCompare(b.id),
);
export const CORPUS_GENERATED_AT = parsed.data.generatedAt;

export const sourceById: ReadonlyMap<string, Source> = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceOf(article: Article): Source | undefined {
  return sourceById.get(article.sourceId);
}

/** Number of weeks of digest pages to publish (keeps page count bounded on deep archives). */
export const DIGEST_WEEKS = 8;

export const DIGESTS: WeeklyDigest[] = buildWeeklyDigests(ARTICLES).slice(0, DIGEST_WEEKS);

export const TOPIC_LABELS: Record<Topic, string> = {
  engineering: "Engineering",
  backend: "Backend",
  frontend: "Frontend",
  mobile: "Mobile",
  "data-science": "Data Science",
  "ai-ml": "AI & ML",
  infrastructure: "Infrastructure",
  "devops-sre": "DevOps & SRE",
  security: "Security",
  "fintech-payments": "Fintech & Payments",
  scale: "Scale",
  platform: "Platform",
  culture: "Engineering Culture",
  "product-engineering": "Product Engineering",
};

export const TOPIC_DESCRIPTIONS: Record<Topic, string> = {
  engineering: "General engineering writing from Indian tech teams.",
  backend: "APIs, microservices, databases, queues and server-side architecture.",
  frontend: "Web clients, performance and interface engineering.",
  mobile: "Android, iOS and cross-platform engineering.",
  "data-science": "Analytics, experimentation, data platforms and pipelines.",
  "ai-ml": "Machine learning, LLMs, recommendations and applied AI.",
  infrastructure: "Cloud, compute, networking and foundational platform infrastructure.",
  "devops-sre": "Observability, reliability, deployment and incident practice.",
  security: "AppSec, fraud, risk and platform security.",
  "fintech-payments": "Payments, lending, UPI and financial systems engineering.",
  scale: "War stories of scaling to millions and billions.",
  platform: "Internal platforms, frameworks, SDKs and tooling.",
  culture: "Hiring, teams, careers and engineering management.",
  "product-engineering": "Where product thinking meets engineering.",
};

export function topicsWithCounts(): { topic: Topic; label: string; count: number }[] {
  return TOPICS.map((topic) => ({
    topic,
    label: TOPIC_LABELS[topic],
    count: ARTICLES.filter((a) => a.topics.includes(topic)).length,
  }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function articlesForTopic(topic: Topic): Article[] {
  return ARTICLES.filter((a) => a.topics.includes(topic));
}

export function articlesForSource(sourceId: string): Article[] {
  return ARTICLES.filter((a) => a.sourceId === sourceId);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = now.getTime() - then;
  const days = Math.floor(diff / 86_400_000);
  if (diff < 0) return formatDate(iso);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  return formatDate(iso);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Absolute canonical URL for a build-time pathname (trailing slash stripped). */
export function canonicalFor(pathname: string): string {
  const clean = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return `${SITE.url}${clean === "/" ? "" : clean}`;
}

/** Deterministic editorial palette for source badges. */
const BADGE_PALETTE = [
  "#B83280",
  "#0F766E",
  "#3730A3",
  "#8D4D0B",
  "#2F6F4F",
  "#7C2D12",
  "#5B3FA8",
  "#0E5A8A",
] as const;

export function badgeColor(source: Source): string {
  const idx = SOURCES.findIndex((s) => s.id === source.id);
  return BADGE_PALETTE[(idx < 0 ? 0 : idx) % BADGE_PALETTE.length]!;
}
