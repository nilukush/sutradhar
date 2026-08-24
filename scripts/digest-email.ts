/**
 * Renders the latest weekly digest as send-ready email files:
 *   .generated/newsletter-<week>.html  (paste into a beehiiv broadcast / rich editor)
 *   .generated/newsletter-<week>.txt   (plain-text twin)
 *
 * The weekly $0 send workflow: `pnpm digest:email` → open the HTML in a
 * browser → select-all → paste into the beehiiv broadcast (Launch plan,
 * 2,500 subs, unlimited sends) → send.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderNewsletterEmail } from "../src/lib/newsletterEmail";
import { DIGESTS } from "../src/lib/view";

const root = resolve(fileURLToPath(import.meta.url), "../..");

if (DIGESTS.length === 0) {
  console.error("No digests in the corpus — run `pnpm fetch` first.");
  process.exit(1);
}

const digest = DIGESTS[0]!;
const email = renderNewsletterEmail(digest);

const outDir = resolve(root, ".generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `newsletter-${digest.id}.html`), email.html, "utf8");
writeFileSync(resolve(outDir, `newsletter-${digest.id}.txt`), email.text, "utf8");

console.log(`Subject: ${email.subject}`);
console.log(`Wrote .generated/newsletter-${digest.id}.html (+.txt) — ${digest.articles.length} stories, week ${digest.id}`);
