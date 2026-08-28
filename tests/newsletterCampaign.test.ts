import { describe, expect, it, vi } from "vitest";
import {
  latestCompletedDigest,
  sendWeeklyCampaign,
} from "@/lib/newsletterCampaign";
import type { WeeklyDigest } from "@/lib/digest";

const KEY = "xkeysib-test";
const ENV = { BREVO_API_KEY: KEY, SENDER_EMAIL: "owner@example.in", SENDER_NAME: "Sutradhar" };

function digest(id: string, endDate: string): WeeklyDigest {
  return {
    id,
    startDate: "2026-08-17",
    endDate,
    articles: [
      {
        id: "0123456789abcdef",
        title: "Story",
        url: "https://x.io/s",
        sourceId: "phonepe",
        publishedAt: "2026-08-18T10:00:00.000Z",
        excerpt: "e",
        content: "",
        topics: ["engineering"],
        authors: [],
      },
    ],
  };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("latestCompletedDigest", () => {
  it("picks the newest digest whose week has fully ended", () => {
    const digests = [digest("2026-W35", "2026-08-30"), digest("2026-W34", "2026-08-23"), digest("2026-W33", "2026-08-16")];
    // Today 2026-08-31 → W35 ended 08-30 → pick W35
    expect(latestCompletedDigest(digests, new Date("2026-08-31T04:00:00Z"))?.id).toBe("2026-W35");
    // Today 2026-08-29 → W35 still running → pick W34
    expect(latestCompletedDigest(digests, new Date("2026-08-29T04:00:00Z"))?.id).toBe("2026-W34");
  });
  it("returns undefined when no week has completed yet", () => {
    expect(latestCompletedDigest([digest("2026-W35", "2026-08-30")], new Date("2026-08-28T00:00:00Z"))).toBeUndefined();
  });
});

describe("sendWeeklyCampaign (Brevo)", () => {
  const email = { subject: "Sutradhar week 2026-W34", html: "<p>hi</p>", text: "hi" };
  const weekly = digest("2026-W34", "2026-08-23");

  it("creates and sends the campaign for the completed week", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ campaigns: [] }, 200)) // not sent before
      .mockResolvedValueOnce(jsonResponse({ id: 555 }, 201)) // create campaign
      .mockResolvedValueOnce(jsonResponse({}, 200)); // send

    const result = await sendWeeklyCampaign(weekly, email, ENV, fetchImpl);
    expect(result).toEqual({ sent: true, campaignId: 555 });

    const createCall = fetchImpl.mock.calls[2]!;
    expect(String(createCall[0])).toBe("https://api.brevo.com/v3/emailCampaigns");
    const payload = JSON.parse(createCall[1].body);
    expect(payload.subject).toBe(email.subject);
    expect(payload.type).toBe("classic"); // marketing type → unsubscribe footer auto-added
    expect(payload.recipients.listIds).toEqual([7]);
    expect(payload.sender.email).toBe(ENV.SENDER_EMAIL);

    const sendCall = fetchImpl.mock.calls[3]!;
    expect(String(sendCall[0])).toBe("https://api.brevo.com/v3/emailCampaigns/555/sendNow");
  });

  it("skips cleanly when this week's campaign already exists (idempotent reruns)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ campaigns: [{ id: 1, name: "Sutradhar 2026-W34", status: "sent" }] }, 200));
    const result = await sendWeeklyCampaign(weekly, email, ENV, fetchImpl);
    expect(result).toEqual({ sent: false, reason: "already-sent" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("creates folder + list when missing, then proceeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [] }, 200))
      .mockResolvedValueOnce(jsonResponse({ folders: [{ id: 3, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 12 }, 201)) // create list
      .mockResolvedValueOnce(jsonResponse({ campaigns: [] }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 556 }, 201))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await sendWeeklyCampaign(weekly, email, ENV, fetchImpl);
    expect(result.sent).toBe(true);
    expect(JSON.parse(fetchImpl.mock.calls[2]![1].body)).toEqual({ name: "Sutradhar", folderId: 3 });
  });

  it("refuses to run without an API key (misconfiguration guard)", async () => {
    const fetchImpl = vi.fn();
    const result = await sendWeeklyCampaign(weekly, email, { ...ENV, BREVO_API_KEY: undefined }, fetchImpl);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not-configured");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
