import { SITE } from "@/lib/site";

/**
 * The single switch point for the newsletter subscribe flow.
 *
 * Default: "api-form" — an inline email form on our site posting to the
 * Cloudflare Worker (/api/subscribe), which stores subscribers in Brevo
 * (free, permanent) and emails the owner on every signup. Weekly sending is
 * fully automated via the newsletter workflow (Brevo campaign API).
 * Override with SUBSCRIBE_PROVIDER=beehiiv-embed|beehiiv-hosted|github-issue.
 */
export type SubscribeProvider =
  | "api-form"
  | "github-issue"
  | "beehiiv-hosted"
  | "beehiiv-embed"
  | "mailto";

/**
 * The beehiiv publication (Launch plan — $0, 2,500 subscribers, unlimited
 * sends). Default is our publication; BEEHIIV_URL overrides at build time.
 * Read lazily so config resolves at build/render time, not import time.
 */
function beehiivUrlFromEnv(): string {
  return process.env.BEEHIIV_URL ?? "https://sutradhar.beehiiv.com";
}

/**
 * Inline embed form URL (https://subscribe-forms.beehiiv.com/<form-uuid>) —
 * set BEEHIIV_EMBED_URL once a subscribe form is created in the beehiiv
 * dashboard (Subscribers → Subscribe forms). The embed renders the email
 * capture directly on our site: enter email → click → done, no redirect.
 * Takes precedence over the hosted page when both are configured.
 */
function beehiivEmbedUrlFromEnv(): string {
  return process.env.BEEHIIV_EMBED_URL ?? "";
}

export interface SubscribeOverride {
  provider?: SubscribeProvider;
  /** e.g. https://<publication>.beehiiv.com */
  beehiivUrl?: string;
}

export interface SubscribeOptions {
  provider: SubscribeProvider;
  /** "get" = no-JS form to GitHub; "link" = plain anchor; "embed" = inline iframe form. */
  method: "get" | "link" | "embed";
  /** Form action (github-issue) or link href (beehiiv-hosted). */
  action?: string;
  href?: string;
  /** beehiiv embed iframe src (beehiiv-embed). */
  embedUrl?: string;
  fields: { title: string; template: string };
  fallbacks: { rss: string };
}

/** True once SITE.repoUrl points at a real repo (not the TODO placeholder). */
export function isRepoConfigured(repoUrl: string = SITE.repoUrl): boolean {
  return (
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoUrl) &&
    !repoUrl.includes("TODO-OWNER")
  );
}

export function subscribeOptions(override: SubscribeOverride = {}): SubscribeOptions {
  const beehiivUrl = override.beehiivUrl ?? beehiivUrlFromEnv();
  const embedUrl = beehiivEmbedUrlFromEnv();
  const envProvider = process.env.SUBSCRIBE_PROVIDER as SubscribeProvider | undefined;
  const provider = override.provider ?? envProvider ?? "api-form";
  const fallbacks = { rss: "/rss.xml" };

  if (provider === "api-form") {
    return {
      provider,
      method: "post",
      action: "/api/subscribe",
      fields: { title: "", template: "" },
      fallbacks,
    };
  }

  if (provider === "beehiiv-embed") {
    return {
      provider,
      method: "embed",
      embedUrl,
      fields: { title: "", template: "" },
      fallbacks,
    };
  }

  if (provider === "beehiiv-hosted") {
    return {
      provider,
      method: "link",
      href: beehiivUrl,
      fields: { title: "", template: "" },
      fallbacks,
    };
  }

  // github-issue: GET form → GitHub's new-issue page, pre-filled via query
  // params. `template` selects subscribe.md directly (skips the chooser);
  // `labels` is deliberately NOT sent — outsiders lack label permission and
  // GitHub 404s on disallowed params. The template's front matter sets labels.
  const base = SITE.repoUrl.replace(/\/+$/, "");
  return {
    provider: "github-issue",
    method: "get",
    action: `${base}/issues/new`,
    fields: { title: "Subscribe request", template: "subscribe.md" },
    fallbacks,
  };
}

export function subscribeAction() {
  const options = subscribeOptions();
  return {
    /**
     * Body pre-fill for the GitHub issue (carries the entered email). Used by
     * tests; the no-JS form sends the raw email as `body` directly.
     */
    buildBody(email: string): string {
      return [
        "Subscribe request",
        "",
        `Email: ${email.trim()}`,
        "",
        `(Sent from ${SITE.url}/newsletter — please keep this issue as the subscription record.)`,
      ].join("\n");
    },
    ...options,
  };
}
