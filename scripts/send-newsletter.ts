/**
 * Weekly automated newsletter send (Brevo campaign API — free tier).
 * Triggered by .github/workflows/newsletter.yml every Monday ~09:07 IST and
 * manually via workflow_dispatch. Idempotent: a week already sent is skipped.
 *
 * Required secrets (repo → Settings → Secrets → Actions):
 *   BREVO_API_KEY — Brevo v3 API key (brevo.com → SMTP & API → API Keys)
 *   OWNER_EMAIL   — confirmed Brevo sender + reply-to (your email)
 */
import { renderNewsletterEmail } from "../src/lib/newsletterEmail";
import { latestCompletedDigest, sendWeeklyCampaign } from "../src/lib/newsletterCampaign";
import { DIGESTS } from "../src/lib/view";

const env = {
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  SENDER_EMAIL: process.env.OWNER_EMAIL ?? "",
  SENDER_NAME: "Sutradhar",
};

if (!env.BREVO_API_KEY || !env.SENDER_EMAIL) {
  console.error("Missing BREVO_API_KEY / OWNER_EMAIL secrets — configure repo secrets first.");
  process.exit(1);
}

const digest = latestCompletedDigest(DIGESTS, new Date());
if (!digest) {
  console.log("No fully-completed week to send yet — nothing to do.");
  process.exit(0);
}

const email = renderNewsletterEmail(digest);
console.log(`Week ${digest.id}: ${digest.articles.length} stories — creating campaign…`);

const result = await sendWeeklyCampaign(digest, email, env);

if (result.sent) {
  console.log(`✓ Campaign ${result.campaignId} sent to the Sutradhar list (week ${digest.id}).`);
} else if (result.reason === "already-sent") {
  console.log(`Week ${digest.id} was already sent — skipping.`);
} else {
  console.error(`✗ Send failed: ${result.reason} (campaign ${result.campaignId ?? "-"}). Check Brevo sender confirmation and API key.`);
  process.exit(1);
}
