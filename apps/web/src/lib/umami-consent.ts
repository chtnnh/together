export const UMAMI_CONSENT_STORAGE_KEY = "together.umami-consent";

export type UmamiConsent = "essential" | "basic" | "replay";

export function isDoNotTrackEnabled(
  navigatorValue?: {
    doNotTrack?: string | null;
    msDoNotTrack?: string | null;
  },
  windowValue?: object,
): boolean {
  const windowDoNotTrack = (windowValue as { doNotTrack?: string | null } | undefined)?.doNotTrack;
  return [navigatorValue?.doNotTrack, navigatorValue?.msDoNotTrack, windowDoNotTrack].some(
    (value) => value === "1" || value?.toLowerCase() === "yes",
  );
}

export function parseUmamiConsent(value: string | null | undefined): UmamiConsent {
  return value === "basic" || value === "replay" ? value : "essential";
}

export function resolveUmamiConsent(
  storedValue: string | null | undefined,
  doNotTrack: boolean,
): UmamiConsent {
  return doNotTrack ? "essential" : parseUmamiConsent(storedValue);
}

export function canLoadUmamiTracker(consent: UmamiConsent): boolean {
  return consent === "essential" || consent === "basic" || consent === "replay";
}

/** Admin routes must never initialize analytics or replay collection. */
export function isUmamiExcludedRoute(pathname: string): boolean {
  return /^\/admin(?:\/|$)/.test(pathname);
}

export function canLoadUmamiRecorder(consent: UmamiConsent): boolean {
  return consent === "replay";
}

const credentialQueryKeys = new Set([
  "password",
  "token",
  "code",
  "state",
  "access_token",
  "refresh_token",
  "email",
]);
const utmQueryKeys = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

function hasCredentialKey(params: URLSearchParams): boolean {
  return [...params.keys()].some((key) => credentialQueryKeys.has(key.toLowerCase()));
}

/** Credentials in the active URL must prevent analytics from loading at all. */
export function hasCredentialQuery(value: string): boolean {
  try {
    const url = new URL(value, "https://together.invalid");
    const hash = url.hash.slice(1);
    return hasCredentialKey(url.searchParams) || hasCredentialKey(new URLSearchParams(hash));
  } catch {
    return false;
  }
}

/** Remove URL secrets and room identities before sending analytics. */
export function sanitizeUmamiUrl(value: string, base?: string): string {
  if (!value.trim()) return value;
  try {
    const url = new URL(value, base ?? "https://together.invalid");
    const utmParams = new URLSearchParams();
    url.searchParams.forEach((item, key) => {
      if (utmQueryKeys.has(key.toLowerCase())) utmParams.append(key, item);
    });
    url.search = utmParams.toString();
    url.hash = "";
    url.pathname = url.pathname.replace(/^\/r\/[^/]+(?=\/|$)/, "/r/[room]");
    return url.toString();
  } catch {
    const [pathAndQuery] = value.split("#", 1);
    const [path, query = ""] = pathAndQuery.split("?", 2);
    const params = new URLSearchParams(query.split("#", 1)[0]);
    const retained = new URLSearchParams();
    params.forEach((item, key) => {
      if (utmQueryKeys.has(key.toLowerCase())) retained.append(key, item);
    });
    const sanitizedPath = path.replace(/\/r\/[^/?#]+(?=\/|$)/, "/r/[room]");
    return retained.size ? `${sanitizedPath}?${retained}` : sanitizedPath;
  }
}

function sanitizeUmamiSrcset(value: string, base?: string): string {
  return value
    .split(",")
    .map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      return url ? [sanitizeUmamiUrl(url, base), ...descriptor].join(" ") : candidate;
    })
    .join(", ");
}

/** Sanitize URL-valued fields before sending tracker or recorder payloads. */
export function sanitizeUmamiPayload<T>(payload: T, base?: string): T {
  return sanitizeUmamiValue(payload, base) as T;
}

function sanitizeUmamiValue(
  value: unknown,
  base?: string,
  insideTitle = false,
  insideMeta = false,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => sanitizeUmamiValue(item, base, insideTitle, insideMeta));
  if (!value || typeof value !== "object") return value;
  const isTitleNode = String((value as { tagName?: unknown }).tagName).toLowerCase() === "title";
  const isMetaNode = String((value as { tagName?: unknown }).tagName).toLowerCase() === "meta";
  const isSensitiveMetaNode =
    isMetaNode &&
    String((value as { attributes?: { name?: unknown } }).attributes?.name).toLowerCase() !==
      "viewport";
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      typeof item === "string"
        ? key.toLowerCase() === "title" ||
          (isTitleNode && key === "textContent") ||
          (insideMeta && key === "content")
          ? "Together"
          : key.toLowerCase() === "srcset"
            ? sanitizeUmamiSrcset(item, base)
            : /(?:url|href|src|action|referrer)$/i.test(key)
              ? sanitizeUmamiUrl(item, base)
              : item
        : sanitizeUmamiValue(
            item,
            base,
            insideTitle || isTitleNode,
            insideMeta || isSensitiveMetaNode,
          ),
    ]),
  );
}
