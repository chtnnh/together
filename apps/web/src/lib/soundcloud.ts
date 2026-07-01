// TODO(v0.3): SoundCloud import — server routes kept; UI hidden (SoundCloud API requires Artist Pro).
const SOUNDCLOUD_API = "https://api-v2.soundcloud.com";

export interface SoundCloudTrack {
  title: string;
  artist: string;
  durationMs: number;
  externalId: string;
}

interface SoundCloudUser {
  username?: string;
}

interface SoundCloudTrackResource {
  kind: "track";
  id: number;
  title: string;
  duration: number;
  user?: SoundCloudUser;
}

interface SoundCloudPlaylistResource {
  kind: "playlist";
  id: number;
  title: string;
  track_count?: number;
  tracks?: SoundCloudTrackResource[];
}

type SoundCloudResolveResult = SoundCloudTrackResource | SoundCloudPlaylistResource;

export function isSoundCloudUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return /(^|\.)soundcloud\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function getClientId(): string {
  return process.env.SOUNDCLOUD_CLIENT_ID?.trim() ?? "";
}

function mapTrack(track: SoundCloudTrackResource): SoundCloudTrack {
  return {
    title: track.title,
    artist: track.user?.username ?? "Unknown artist",
    durationMs: track.duration,
    externalId: String(track.id),
  };
}

async function soundcloudFetch<T>(path: string): Promise<T> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error("SOUNDCLOUD_CLIENT_ID is not configured");
  }

  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${SOUNDCLOUD_API}${path}${separator}client_id=${clientId}`);
  if (!res.ok) {
    throw new Error(`SoundCloud request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function fetchPlaylistTracks(playlistId: number): Promise<SoundCloudTrack[]> {
  const page = await soundcloudFetch<SoundCloudTrackResource[] | SoundCloudPlaylistPage>(
    `/playlists/${playlistId}/tracks?limit=200`,
  );
  const batch = Array.isArray(page) ? page : (page.collection ?? []);
  return batch.map(mapTrack);
}

interface SoundCloudPlaylistPage {
  collection?: SoundCloudTrackResource[];
  next_href?: string | null;
}

export async function importSoundCloudUrl(input: string): Promise<SoundCloudTrack[]> {
  const url = input.trim();
  if (!url) {
    throw new Error("Enter a SoundCloud URL");
  }
  if (!isSoundCloudUrl(url)) {
    throw new Error("Enter a valid SoundCloud track or playlist URL");
  }

  const resolved = await soundcloudFetch<SoundCloudResolveResult>(
    `/resolve?url=${encodeURIComponent(url)}`,
  );

  if (resolved.kind === "track") {
    return [mapTrack(resolved)];
  }

  if (resolved.kind === "playlist") {
    if (Array.isArray(resolved.tracks) && resolved.tracks.length > 0) {
      return resolved.tracks.map(mapTrack);
    }
    return fetchPlaylistTracks(resolved.id);
  }

  throw new Error("Unsupported SoundCloud URL — use a track or playlist link");
}
