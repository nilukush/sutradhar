import type { WeeklyDigest } from "@/lib/digest";
import { formatDate, sourceOf } from "@/lib/view";
import { articleHref } from "@/lib/read";
import { SITE } from "@/lib/site";

/**
 * Renders the weekly digest as an email (HTML + plain text) for manual
 * sending — paste into a beehiiv broadcast (free Launch plan) or any mail
 * client. Email-safe markup only: tables, inline styles, no scripts/css.
 */
export interface NewsletterEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderNewsletterEmail(digest: WeeklyDigest, siteUrl: string = SITE.url): NewsletterEmail {
  const subject = `Sutradhar — week ${digest.id}: ${digest.articles.length} stories from India's engineering teams`;

  const lede = `In week ${digest.id} (${digest.startDate} to ${digest.endDate}), ${digest.articles.length} engineering ${digest.articles.length === 1 ? "story was" : "stories were"} published across ${new Set(digest.articles.map((a) => a.sourceId)).size} Indian tech ${new Set(digest.articles.map((a) => a.sourceId)).size === 1 ? "company" : "companies"}.`;

  const rows = digest.articles
    .map((a) => {
      const source = sourceOf(a);
      const sourceName = source?.name ?? a.sourceId;
      // In-site reading page (short excerpt + context) + the original article.
      const readUrl = `${siteUrl}${articleHref(a)}`;
      return `
      <tr>
        <td style="padding:0 0 28px 0;">
          <p style="margin:0 0 4px 0;font-size:12px;color:#57534E;">${sourceName} · ${formatDate(a.publishedAt)}</p>
          <p style="margin:0 0 6px 0;font-size:18px;line-height:1.3;"><a href="${readUrl}" style="color:#1C1917;text-decoration:none;">${escapeHtml(a.title)}</a></p>
          ${a.excerpt ? `<p style="margin:0 0 6px 0;font-size:14px;line-height:1.5;color:#57534E;">${escapeHtml(a.excerpt)}</p>` : ""}
          <p style="margin:0;font-size:12px;"><a href="${a.url}" style="color:#0F766E;">Read the original ↗</a></p>
        </td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF6EE;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EE;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border:1px solid #E3DBCB;border-radius:10px;">
        <tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #E8590C;">
          <p style="margin:0 0 4px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#E8590C;font-family:Courier,monospace;">सूत्रधर · The weekly thread</p>
          <h1 style="margin:0;font-size:26px;color:#1C1917;">India's engineering week ${digest.id}</h1>
          <p style="margin:8px 0 0 0;font-size:14px;color:#57534E;">${digest.startDate} → ${digest.endDate} · ${digest.articles.length} stories</p>
        </td></tr>
        <tr><td style="padding:16px 32px 8px 32px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#1C1917;">${escapeHtml(lede)}</p>
        </td></tr>
        <tr><td style="padding:12px 32px 20px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:16px 32px 28px 32px;border-top:1px solid #E3DBCB;">
          <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.5;">
            Sutradhar — every engineering story from India, woven into one thread.<br/>
            <a href="${siteUrl}" style="color:#0F766E;">${siteUrl}</a> · <a href="${siteUrl}/rss.xml" style="color:#0F766E;">RSS</a><br/>
            Excerpts only — every story links to its original publisher. Unsubscribe: reply to this email with “unsubscribe”.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `SUTRADHAR — THE WEEKLY THREAD`,
    `India's engineering week ${digest.id} (${digest.startDate} → ${digest.endDate})`,
    ``,
    lede,
    ``,
    ...digest.articles.map(
      (a) =>
        `- ${sourceOf(a)?.name ?? a.sourceId} · ${formatDate(a.publishedAt)}\n  ${a.title}\n  Original: ${a.url}`,
    ),
    ``,
    `${siteUrl} · RSS: ${siteUrl}/rss.xml`,
    `Unsubscribe: reply to this email with "unsubscribe".`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
