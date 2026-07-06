const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

const SCOPES = ["playlist-read-private", "playlist-read-collaborative"].join(" ");

let clientCredentialsCache: { token: string; expiresAt: number } | null = null;

export function isSpotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function isSpotifyOAuthEnabled(): boolean {
  return process.env.SPOTIFY_OAUTH_ENABLED === "1";
}

export function parseSpotifyPlaylistUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch?.[1]) return uriMatch[1];

  try {
    const url = new URL(trimmed);
    if (!/(^|\.)spotify\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const playlistIndex = parts.indexOf("playlist");
    if (playlistIndex === -1 || !parts[playlistIndex + 1]) return null;
    return parts[playlistIndex + 1]!;
  } catch {
    return null;
  }
}

export async function getClientCredentialsToken(): Promise<string> {
  if (clientCredentialsCache && clientCredentialsCache.expiresAt > Date.now() + 60_000) {
    return clientCredentialsCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("Spotify is not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) throw new Error("Failed to obtain Spotify access token");

  const data = (await res.json()) as { access_token: string; expires_in: number };
  clientCredentialsCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function getSpotifyAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? process.env.SPOTIFY_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${SPOTIFY_AUTH_URL}?${params}`;
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) throw new Error("Failed to exchange Spotify code");
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

export async function getSpotifyPlaylists(accessToken: string) {
  const playlists: Array<{ id: string; name: string; trackCount: number }> = [];
  let url: string | null = `${SPOTIFY_API}/me/playlists?limit=50`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      items: Array<{ id: string; name: string; tracks: { total: number } }>;
      next: string | null;
    };

    playlists.push(
      ...data.items.map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p.tracks.total,
      })),
    );
    url = data.next;
  }

  return playlists;
}

async function fetchPlaylistTracksWithToken(accessToken: string, playlistId: string) {
  const tracks: Array<{
    title: string;
    artist: string;
    durationMs: number;
    externalId: string;
    isrc?: string;
  }> = [];

  let url: string | null = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=50`;

  while (url && tracks.length < 200) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Spotify playlist unavailable (${res.status})`);
    }

    const data = (await res.json()) as {
      items: Array<{
        track: {
          id: string;
          name: string;
          duration_ms: number;
          external_ids?: { isrc?: string };
          artists: Array<{ name: string }>;
        } | null;
      }>;
      next: string | null;
    };

    for (const item of data.items) {
      if (!item.track) continue;
      tracks.push({
        title: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(", "),
        durationMs: item.track.duration_ms,
        externalId: item.track.id,
        isrc: item.track.external_ids?.isrc,
      });
    }
    url = data.next;
  }

  return tracks;
}

export async function getSpotifyPlaylistTracks(accessToken: string, playlistId: string) {
  return fetchPlaylistTracksWithToken(accessToken, playlistId);
}

export async function getPublicSpotifyPlaylistTracks(playlistId: string) {
  const token = await getClientCredentialsToken();
  return fetchPlaylistTracksWithToken(token, playlistId);
}
