/**
 * Sutradhar aggregation run — fetches every source, merges into the corpus
 * (src/data/articles.json) and writes it only when something changed, so the
 * scheduled GitHub Action deploys only on genuine updates.
 *
 * Usage: pnpm fetch [--dry-run]
 * Exit codes: 0 = ok (partial source failures tolerated), 1 = total failure.
 */
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { SOURCES } from "../src/data/sources";
import { fetchAllSources } from "../src/lib/pipeline";
import { mergeArticles } from "../src/lib/aggregate";
import { CorpusSchema } from "../src/lib/schema";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const corpusPath = resolve(root, "src/data/articles.json");
const dryRun = process.argv.includes("--dry-run");

function readCorpus(): { generatedAt: string; articles: import("../src/lib/schema").Article[] } {
  if (!existsSync(corpusPath)) return { generatedAt: new Date(0).toISOString(), articles: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(corpusPath, "utf8"));
  } catch {
    console.warn("⚠ existing corpus is not valid JSON (truncated write?) — rebuilding from scratch");
    return { generatedAt: new Date(0).toISOString(), articles: [] };
  }
  const parsed = CorpusSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn("⚠ existing corpus failed schema validation — rebuilding from scratch");
  return { generatedAt: new Date(0).toISOString(), articles: [] };
}

async function main() {
  console.log(`Sutradhar fetch: ${SOURCES.length} sources, dry-run=${dryRun}`);
  const existing = readCorpus();
  const { articles, errors } = await fetchAllSources(SOURCES);

  const perSource = new Map<string, number>();
  for (const a of articles) perSource.set(a.sourceId, (perSource.get(a.sourceId) ?? 0) + 1);
  for (const source of SOURCES) {
    console.log(`  ${String(perSource.get(source.id) ?? 0).padStart(3)}  ${source.id}`);
  }
  for (const e of errors) console.warn(`  ✗ ${e.sourceId}: ${e.error}`);

  const merged = mergeArticles(existing.articles, articles);
  console.log(
    `fetched=${articles.length} existing=${existing.articles.length} merged=${merged.articles.length} changed=${merged.changed} errors=${errors.length}`,
  );

  if (!dryRun && merged.changed) {
    const corpus = { generatedAt: new Date().toISOString(), articles: merged.articles };
    // Atomic write: a runner killed mid-write must never leave a truncated corpus.
    const tmpPath = corpusPath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(corpus, null, 2) + "\n", "utf8");
    renameSync(tmpPath, corpusPath);
    console.log(`wrote ${corpusPath}`);
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${merged.changed ? "true" : "false"}\n`);
  }

  if (errors.length === SOURCES.length) {
    console.error("every source failed — treating as total failure");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
