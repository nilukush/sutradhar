import { SITE } from "@/lib/site";

/** AI/search crawlers are explicitly welcome — citability is the moat (docs/ANALYSIS.md §5.6). */
const WELCOME = [
  "*",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "Bytespider",
  "CCBot",
];

export function GET() {
  const body =
    WELCOME.map((agent) => `User-agent: ${agent}\nAllow: /`).join("\n\n") +
    `\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
