import { describe, expect, it } from "vitest";
import { renderNewsletterEmail } from "@/lib/newsletterEmail";
import type { WeeklyDigest } from "@/lib/digest";
import type { Article } from "@/lib/schema";

function article(id: string, title: string, sourceId = "phonepe"): Article {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    sourceId,
    publishedAt: "2026-08-20T10:00:00.000Z",
    excerpt: `Excerpt of ${title}`,
    content: "",
    topics: ["engineering"],
    authors: [],
  };
}

const digest: WeeklyDigest = {
  id: "2026-W34",
  startDate: "2026-08-17",
  endDate: "2026-08-23",
  articles: [article("a", "Scaling UPI to a billion requests"), article("b", "Our Kafka migration", "razorpay")],
};

describe("renderNewsletterEmail", () => {
  it("renders a subject with the week id and story count", () => {
    const out = renderNewsletterEmail(digest, "https://sutradhar.nilukush.workers.dev");
    expect(out.subject).toContain("2026-W34");
    expect(out.subject).toContain("2");
  });

  it("renders every article title, source name, in-site link and the original link", () => {
    const out = renderNewsletterEmail(digest, "https://sutradhar.nilukush.workers.dev");
    expect(out.html).toContain("Scaling UPI to a billion requests");
    expect(out.html).toContain("Our Kafka migration");
    expect(out.html).toContain("PhonePe");
    expect(out.html).toContain("https://sutradhar.nilukush.workers.dev/read/");
    expect(out.html).toContain("https://example.com/a");
  });

  it("renders a plain-text twin that carries titles and links", () => {
    const out = renderNewsletterEmail(digest, "https://sutradhar.nilukush.workers.dev");
    expect(out.text).toContain("Scaling UPI to a billion requests");
    expect(out.text).toContain("https://example.com/a");
  });

  it("uses email-safe markup only (tables, inline styles, no scripts or external css)", () => {
    const out = renderNewsletterEmail(digest, "https://sutradhar.nilukush.workers.dev");
    expect(out.html).toMatch(/<table/);
    expect(out.html).toMatch(/style="/);
    expect(out.html).not.toMatch(/<script|<link\s/i);
  });

  it("ends with the unsubscribe line (Gmail manual list compliance)", () => {
    const out = renderNewsletterEmail(digest, "https://sutradhar.nilukush.workers.dev");
    expect(out.text).toMatch(/unsubscribe/i);
  });
});
