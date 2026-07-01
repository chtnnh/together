// TODO(v0.3): Spotify import — server routes kept; UI hidden until OAuth flow is production-ready.
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

const SCOPES = ["playlist-read-private", "playlist-read-collaborative"].join(" ");

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

export async function getSpotifyPlaylistTracks(accessToken: string, playlistId: string) {
  const tracks: Array<{
    title: string;
    artist: string;
    durationMs: number;
    externalId: string;
    isrc?: string;
  }> = [];

  let url: string | null = `${SPOTIFY_API}/playlists/${playlistId}/items?limit=50`;

  while (url && tracks.length < 200) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;

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
