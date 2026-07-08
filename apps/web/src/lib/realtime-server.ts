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

export async function fetchRealtimeJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; reason: "unconfigured" | "failed" }> {
  const base = getRealtimeHttpBase();
  if (!base) return { ok: false, reason: "unconfigured" };

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REALTIME_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: "failed" };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
