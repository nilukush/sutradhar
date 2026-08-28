/**
 * Weekly automated sending via Brevo campaign API (free tier: 300 emails/day,
 * permanent). Runs from the scheduled GitHub Action; fetch is injected so the
 * flow is unit-testable. Classic campaigns get Brevo's unsubscribe footer and
 * list-unsubscribe headers automatically.
 */
import { resolveListId } from "@/lib/subscribe-worker";
import type { WeeklyDigest } from "@/lib/digest";
import type { NewsletterEmail } from "@/lib/newsletterEmail";

const API = "https://api.brevo.com/v3";

export interface CampaignEnv {
  BREVO_API_KEY?: string;
  SENDER_EMAIL: string;
  SENDER_NAME?: string;
  BREVO_LIST_NAME?: string;
}

export interface SendResult {
  sent: boolean;
  campaignId?: number;
  reason?: "already-sent" | "not-configured" | "create-failed" | "send-failed";
}

/** The newest digest whose Mon–Sun week has fully ended as of `now`. */
export function latestCompletedDigest(digests: WeeklyDigest[], now: Date): WeeklyDigest | undefined {
  const today = now.toISOString().slice(0, 10);
  return digests.find((d) => d.endDate < today);
}

function headers(apiKey: string): Record<string, string> {
  return { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };
}

export async function sendWeeklyCampaign(
  digest: WeeklyDigest,
  email: NewsletterEmail,
  env: CampaignEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  if (!env.BREVO_API_KEY) return { sent: false, reason: "not-configured" };
  const h = headers(env.BREVO_API_KEY);
  const listName = env.BREVO_LIST_NAME ?? "Sutradhar";
  const campaignName = `Sutradhar ${digest.id}`;

  const listId = await resolveListId(env.BREVO_API_KEY, listName, fetchImpl);

  // Idempotency: never send the same week twice (Action retries are safe).
  const existing = await fetchImpl(`${API}/emailCampaigns?status=sent&limit=50&offset=0`, { headers: h });
  if (existing.ok) {
    const { campaigns = [] }: { campaigns?: { id: number; name?: string; subject?: string }[] } = await existing.json();
    if (campaigns.some((c) => c.name === campaignName || c.subject === email.subject)) {
      return { sent: false, reason: "already-sent" };
    }
  }

  const create = await fetchImpl(`${API}/emailCampaigns`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      name: campaignName,
      subject: email.subject,
      sender: { name: env.SENDER_NAME ?? "Sutradhar", email: env.SENDER_EMAIL },
      replyTo: env.SENDER_EMAIL,
      type: "classic",
      htmlContent: email.html,
      textContent: email.text,
      ...(listId !== null ? { recipients: { listIds: [listId] } } : {}),
      inlineImageActivation: false,
    }),
  });
  if (!create.ok) return { sent: false, reason: "create-failed" };
  const { id }: { id?: number } = await create.json();
  if (id === undefined) return { sent: false, reason: "create-failed" };

  // Endpoint is /sendNow (returns 204 on success) — NOT /send (404s).
  const send = await fetchImpl(`${API}/emailCampaigns/${id}/sendNow`, { method: "POST", headers: h });
  if (!send.ok && send.status !== 204) return { sent: false, reason: "send-failed", campaignId: id };
  return { sent: true, campaignId: id };
}
