export type ImportServiceKey = "youtube" | "spotify" | "soundcloud" | "apple";

const ENDPOINTS: Record<Exclude<ImportServiceKey, "youtube">, string> = {
  spotify: "/api/import/spotify",
  soundcloud: "/api/import/soundcloud",
  apple: "/api/import/apple",
};

export function detectImportServiceFromUrl(input: string): ImportServiceKey | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^spotify:playlist:/i.test(trimmed)) return "spotify";

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
    if (host.includes("spotify.com")) return "spotify";
    if (host.includes("soundcloud.com")) return "soundcloud";
    if (host.includes("music.apple.com") || host.includes("itunes.apple.com")) return "apple";
  } catch {
    // Plain text search — handled as YouTube.
  }

  return null;
}

export function importRequestForQuery(
  query: string,
): { endpoint: string; body: Record<string, string> } {
  const service = detectImportServiceFromUrl(query);
  if (service === "spotify" || service === "soundcloud" || service === "apple") {
    return { endpoint: ENDPOINTS[service], body: { url: query.trim() } };
  }
  return { endpoint: "/api/import/youtube", body: { query: query.trim() } };
}

export function isLikelyUrl(input: string): boolean {
  return detectImportServiceFromUrl(input) !== null || /^https?:\/\//i.test(input.trim());
}
