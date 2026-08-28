/**
 * Inline subscribe endpoint logic (runs inside the Cloudflare Worker).
 * Captures the email into Brevo (free, permanent) and pings the owner.
 * Fetch is injected so the whole flow is unit-testable.
 */
export interface SubscribeEnv {
  BREVO_API_KEY?: string;
  OWNER_EMAIL?: string;
  BREVO_LIST_NAME?: string;
}

const API = "https://api.brevo.com/v3";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function brevoHeaders(apiKey: string): Record<string, string> {
  return { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };
}

/** Find the contact list by name, creating it (inside a same-named folder) on first use. */
export async function resolveListId(
  apiKey: string,
  listName: string,
  fetchImpl: typeof fetch,
): Promise<number | null> {
  const res = await fetchImpl(`${API}/contacts/lists?limit=50&offset=0`, { headers: brevoHeaders(apiKey) });
  if (!res.ok) throw new Error("list lookup failed");
  const { lists = [] }: { lists?: { id: number; name: string }[] } = await res.json();
  const found = lists.find((l) => l.name === listName);
  if (found) return found.id;

  // Brevo list creation REQUIRES a folderId — resolve or create one.
  const foldersRes = await fetchImpl(`${API}/contacts/folders?limit=50&offset=0`, { headers: brevoHeaders(apiKey) });
  if (!foldersRes.ok) throw new Error("folder lookup failed");
  const { folders = [] }: { folders?: { id: number; name: string }[] } = await foldersRes.json();
  let folderId = folders.find((f) => f.name === listName)?.id;
  if (folderId === undefined) {
    const createFolder = await fetchImpl(`${API}/contacts/folders`, {
      method: "POST",
      headers: brevoHeaders(apiKey),
      body: JSON.stringify({ name: listName }),
    });
    if (!createFolder.ok) throw new Error("folder create failed");
    folderId = ((await createFolder.json()) as { id?: number }).id;
    if (folderId === undefined) throw new Error("folder create returned no id");
  }

  const create = await fetchImpl(`${API}/contacts/lists`, {
    method: "POST",
    headers: brevoHeaders(apiKey),
    body: JSON.stringify({ name: listName, folderId }),
  });
  if (!create.ok) throw new Error("list create failed");
  const { id }: { id?: number } = await create.json();
  return id ?? null;
}

export async function handleSubscribe(
  request: Request,
  env: SubscribeEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!env.BREVO_API_KEY) {
    return json({ ok: false, error: "Subscriptions are not configured yet — please use RSS meanwhile." }, 503);
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  const headers = brevoHeaders(env.BREVO_API_KEY);
  try {
    const listId = await resolveListId(headers["api-key"]!, env.BREVO_LIST_NAME ?? "Sutradhar", fetchImpl);
    const add = await fetchImpl(`${API}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, updateEnabled: true, ...(listId !== null ? { listIds: [listId] } : {}) }),
    });
    // 204 = already a contact with nothing to update.
    if (!add.ok && add.status !== 204) {
      return json({ ok: false, error: "Could not save the subscription. Please try again." }, 502);
    }

    // Best-effort owner notification — never fails the subscription.
    if (env.OWNER_EMAIL) {
      try {
        await fetchImpl(`${API}/smtp/email`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            sender: { name: "Sutradhar", email: env.OWNER_EMAIL },
            to: [{ email: env.OWNER_EMAIL }],
            subject: `New Sutradhar subscriber: ${email}`,
            textContent: `${email} just subscribed via the website.\n\nManage the list in your Brevo dashboard.`,
          }),
        });
      } catch {
        // notification is optional
      }
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "Subscription service unavailable. Please try again shortly." }, 502);
  }
}
