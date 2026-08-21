import type { Article } from "@/lib/schema";

export interface IsoWeek {
  year: number;
  week: number;
}

/** ISO-8601 week number (Thursday rule, weeks start Monday). */
export function isoWeek(input: string | Date): IsoWeek {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(input)}`);
  // Shift to the Thursday of that week — then the ISO year == calendar year.
  const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  shifted.setUTCDate(shifted.getUTCDate() + 4 - shifted.getUTCDay());
  const year = shifted.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((shifted.getTime() - jan1) / 7 / 86400000) + 1;
  return { year, week };
}

export function digestId(input: string | Date): string {
  const { year, week } = isoWeek(input);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export interface WeeklyDigest {
  id: string;
  /** Monday, YYYY-MM-DD. */
  startDate: string;
  /** Sunday, YYYY-MM-DD. */
  endDate: string;
  articles: Article[];
}

function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() - 1)); // back to Monday
  return d;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Bucket articles into Monday–Sunday weekly digests, newest week first. */
export function buildWeeklyDigests(articles: Article[]): WeeklyDigest[] {
  const byId = new Map<string, Article[]>();
  for (const a of articles) {
    const id = digestId(a.publishedAt);
    const bucket = byId.get(id) ?? [];
    bucket.push(a);
    byId.set(id, bucket);
  }
  return [...byId.entries()]
    .map(([id, weekArticles]) => {
      const monday = weekStart(new Date(weekArticles[0]!.publishedAt));
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      return {
        id,
        startDate: isoDate(monday),
        endDate: isoDate(sunday),
        articles: [...weekArticles].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
      } satisfies WeeklyDigest;
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}
