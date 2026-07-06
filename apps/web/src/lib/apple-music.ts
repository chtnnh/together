import { SignJWT } from "jose";

export function isAppleMusicConfigured(): boolean {
  return !!(
    process.env.APPLE_MUSIC_TEAM_ID &&
    process.env.APPLE_MUSIC_KEY_ID &&
    process.env.APPLE_MUSIC_PRIVATE_KEY
  );
}

export function parseAppleMusicPlaylistUrl(input: string): { storefront: string; id: string } | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)music\.apple\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const storefront = parts[0];
    const playlistIndex = parts.indexOf("playlist");
    if (!storefront || playlistIndex === -1) return null;
    const id = parts[parts.length - 1];
    if (!id || id === "playlist") return null;
    return { storefront, id };
  } catch {
    return null;
  }
}

export async function generateAppleMusicToken(): Promise<string> {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple Music credentials not configured");
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(key);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getAppleMusicPlaylists(userToken: string) {
  const developerToken = await generateAppleMusicToken();

  const res = await fetch(
    "https://api.music.apple.com/v1/me/library/playlists",
    {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": userToken,
      },
    },
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data: Array<{
      id: string;
      attributes: { name: string; trackCount: number };
    }>;
  };

  return data.data.map((p) => ({
    id: p.id,
    name: p.attributes.name,
    trackCount: p.attributes.trackCount,
  }));
}

export async function getAppleMusicPlaylistTracks(
  userToken: string,
  playlistId: string,
) {
  const developerToken = await generateAppleMusicToken();
  const tracks: Array<{
    title: string;
    artist: string;
    durationMs: number;
    externalId: string;
    isrc?: string;
  }> = [];

  let url: string | null = `https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks?limit=100`;

  while (url && tracks.length < 200) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": userToken,
      },
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      data: Array<{
        id: string;
        attributes: {
          name: string;
          artistName: string;
          durationInMillis: number;
          isrc?: string;
        };
      }>;
      next?: string;
    };

    for (const item of data.data) {
      tracks.push({
        title: item.attributes.name,
        artist: item.attributes.artistName,
        durationMs: item.attributes.durationInMillis,
        externalId: item.id,
        isrc: item.attributes.isrc,
      });
    }
    url = data.next ?? null;
  }

  return tracks;
}

export async function getCatalogPlaylistTracks(storefront: string, playlistId: string) {
  const developerToken = await generateAppleMusicToken();
  const tracks: Array<{
    title: string;
    artist: string;
    durationMs: number;
    externalId: string;
    isrc?: string;
  }> = [];

  let url: string | null =
    `https://api.music.apple.com/v1/catalog/${storefront}/playlists/${playlistId}/tracks?limit=100`;

  while (url && tracks.length < 200) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${developerToken}` },
    });
    if (!res.ok) {
      throw new Error(`Apple Music playlist unavailable (${res.status})`);
    }

    const data = (await res.json()) as {
      data: Array<{
        id: string;
        attributes: {
          name: string;
          artistName: string;
          durationInMillis: number;
          isrc?: string;
        };
      }>;
      next?: string;
    };

    for (const item of data.data) {
      tracks.push({
        title: item.attributes.name,
        artist: item.attributes.artistName,
        durationMs: item.attributes.durationInMillis,
        externalId: item.id,
        isrc: item.attributes.isrc,
      });
    }
    url = data.next ?? null;
  }

  return tracks;
}
