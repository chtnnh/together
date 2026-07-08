import {
  buildSourceKey,
  parseDuration,
  parseYouTubePlaylistId,
  parseYouTubeVideoId,
  resolveTrack,
  type YouTubeSearchClient,
} from "@together/track-resolver";
import type { TrackMetadata, YoutubeCandidate } from "@together/shared";
import { getCachedResolution, setCachedResolution } from "./rooms";
import { getYouTubeApiKey } from "./youtube-env";

export class YouTubeApiClient implements YouTubeSearchClient {
  constructor(private apiKey: string) {}

  async search(query: string, maxResults = 10): Promise<YoutubeCandidate[]> {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: String(maxResults),
      key: this.apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; errors?: Array<{ reason?: string }> };
      };
      const reason = body.error?.errors?.[0]?.reason;
      const message = body.error?.message ?? res.statusText;
      throw new Error(
        reason === "keyInvalid"
          ? "Invalid YOUTUBE_API_KEY — check your Google Cloud credentials"
          : reason === "accessNotConfigured"
            ? "YouTube Data API is not enabled for this API key"
            : reason === "quotaExceeded"
              ? "YouTube API daily quota exceeded"
              : message,
      );
    }

    const data = (await res.json()) as {
      items?: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails?: { default?: { url: string } };
        };
      }>;
    };

    const videoIds = data.items?.map((i) => i.id.videoId).filter(Boolean) ?? [];
    const durations = await this.getDurations(videoIds);

    return (
      data.items?.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.default?.url,
        durationMs: durations[item.id.videoId],
      })) ?? []
    );
  }

  async getVideoDetails(videoId: string) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: videoId,
      key: this.apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails?: { medium?: { url: string } };
        };
        contentDetails: { duration: string };
      }>;
    };

    const item = data.items?.[0];
    if (!item) return null;

    return {
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      durationMs: parseDuration(item.contentDetails.duration),
    };
  }

  async getPlaylistDetails(playlistId: string) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: playlistId,
      key: this.apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?${params}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails?: { medium?: { url: string } };
        };
        contentDetails: { itemCount: number };
      }>;
    };

    const item = data.items?.[0];
    if (!item) return null;

    return {
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      itemCount: item.contentDetails.itemCount,
    };
  }

  async getPlaylistItems(playlistId: string) {
    const items: YoutubeCandidate[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50",
        key: this.apiKey,
        ...(pageToken ? { pageToken } : {}),
      });

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
      );
      if (!res.ok) break;

      const data = (await res.json()) as {
        items?: Array<{
          snippet: {
            title: string;
            channelTitle: string;
            resourceId: { videoId: string };
            thumbnails?: { default?: { url: string } };
          };
          contentDetails: { videoId: string };
        }>;
        nextPageToken?: string;
      };

      for (const item of data.items ?? []) {
        items.push({
          videoId: item.contentDetails.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails?.default?.url,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken && items.length < 200);

    return items;
  }

  private async getDurations(
    videoIds: string[],
  ): Promise<Record<string, number>> {
    if (videoIds.length === 0) return {};

    const params = new URLSearchParams({
      part: "contentDetails",
      id: videoIds.join(","),
      key: this.apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
    );
    if (!res.ok) return {};

    const data = (await res.json()) as {
      items?: Array<{ id: string; contentDetails: { duration: string } }>;
    };

    const result: Record<string, number> = {};
    for (const item of data.items ?? []) {
      result[item.id] = parseDuration(item.contentDetails.duration);
    }
    return result;
  }

  /** Returns video IDs that exist and are not deleted/private placeholders. */
  async filterAvailableVideoIds(videoIds: string[]): Promise<Set<string>> {
    const available = new Set<string>();
    if (videoIds.length === 0) return available;

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const params = new URLSearchParams({
        part: "snippet",
        id: chunk.join(","),
        key: this.apiKey,
      });

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params}`,
      );
      if (!res.ok) continue;

      const data = (await res.json()) as {
        items?: Array<{ id: string; snippet: { title: string } }>;
      };

      for (const item of data.items ?? []) {
        if (!/^deleted video$/i.test(item.snippet.title)) {
          available.add(item.id);
        }
      }
    }

    return available;
  }

  async filterAvailableCandidates(
    candidates: YoutubeCandidate[],
  ): Promise<YoutubeCandidate[]> {
    const ids = candidates.map((c) => c.videoId).filter(Boolean);
    const available = await this.filterAvailableVideoIds(ids);
    return candidates.filter((c) => available.has(c.videoId));
  }
}

export function getYouTubeClient() {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    return null;
  }
  return new YouTubeApiClient(apiKey);
}

export async function resolveTrackWithCache(metadata: TrackMetadata) {
  const sourceKey = buildSourceKey(metadata);
  const cached = await getCachedResolution(sourceKey);

  if (cached) {
    return {
      videoId: cached.youtubeId,
      confidence: cached.confidence,
      alternates: (cached.alternates as YoutubeCandidate[]) ?? [],
    };
  }

  const client = getYouTubeClient();
  if (!client) {
    return { videoId: metadata.videoId ?? null, confidence: 100, alternates: [] };
  }

  const result = await resolveTrack(metadata, client);

  if (result.videoId) {
    await setCachedResolution(sourceKey, result.videoId, result.confidence, result.alternates);
  }

  return result;
}

export { parseYouTubeVideoId, parseYouTubePlaylistId };

async function isYouTubeVideoAvailableViaOEmbed(videoId: string): Promise<boolean> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function isYouTubeVideoAvailable(videoId: string): Promise<boolean> {
  const client = getYouTubeClient();
  if (client) {
    const details = await client.getVideoDetails(videoId);
    if (!details) return false;
    return !/^deleted video$/i.test(details.title);
  }
  return isYouTubeVideoAvailableViaOEmbed(videoId);
}

export async function importYouTubeUrl(url: string) {
  const videoId = parseYouTubeVideoId(url);
  if (videoId) {
    const available = await isYouTubeVideoAvailable(videoId);
    if (!available) return [];

    const client = getYouTubeClient();
    const details = client ? await client.getVideoDetails(videoId) : null;
    return [
      {
        source: "youtube" as const,
        videoId,
        title: details?.title ?? "YouTube Video",
        artist: details?.channelTitle,
        durationMs: details?.durationMs,
        thumbnailUrl: details?.thumbnailUrl,
        confidence: 100,
      },
    ];
  }

  const playlistId = parseYouTubePlaylistId(url);
  if (playlistId) {
    const client = getYouTubeClient();
    if (!client) return null;
    const [details, items] = await Promise.all([
      client.getPlaylistDetails(playlistId),
      client.getPlaylistItems(playlistId),
    ]);
    const filtered = await client.filterAvailableCandidates(items);
    if (filtered.length === 0) return null;

    return {
      kind: "playlist" as const,
      title: details?.title ?? "YouTube Playlist",
      artist: details?.channelTitle,
      thumbnailUrl: details?.thumbnailUrl ?? filtered[0]?.thumbnailUrl,
      videoCount: filtered.length,
      tracks: filtered.map((item) => ({
        source: "youtube" as const,
        videoId: item.videoId,
        title: item.title,
        artist: item.channelTitle,
        durationMs: item.durationMs,
        thumbnailUrl: item.thumbnailUrl,
        confidence: 100,
      })),
    };
  }

  return null;
}
