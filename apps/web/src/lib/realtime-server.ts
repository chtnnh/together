const REALTIME_FETCH_TIMEOUT_MS = 3_000;

/** HTTP base URL for server-side calls to the Cloudflare realtime worker. */
export function getRealtimeHttpBase(): string | null {
  const raw =
    process.env.REALTIME_HTTP_URL?.trim() ||
    process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (!raw) return null;

  const base = raw.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
  if (
    process.env.VERCEL_ENV === "production" &&
    /\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(base)
  ) {
    return null;
  }

  return base.replace(/\/$/, "");
}

async function fetchRealtime(path: string, init?: RequestInit): Promise<Response | null> {
  const base = getRealtimeHttpBase();
  if (!base) return null;

  try {
    return await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REALTIME_FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

export async function fetchRealtimeJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; reason: "unconfigured" | "failed" }> {
  const res = await fetchRealtime(path, init);
  if (!res?.ok) return { ok: false, reason: res ? "failed" : "unconfigured" };
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function postRealtimeJson(path: string, body: unknown): Promise<boolean> {
  const res = await fetchRealtime(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res?.ok ?? false;
}
