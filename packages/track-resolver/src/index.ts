import {
  DURATION_TOLERANCE_MS,
  RESOLUTION_AUTO_QUEUE_THRESHOLD,
  RESOLUTION_PROMPT_THRESHOLD,
} from "@together/shared";
import type {
  ResolutionResult,
  TrackMetadata,
  YoutubeCandidate,
} from "@together/shared";

const PENALTY_PATTERNS = [
  /live/i,
  /cover/i,
  /karaoke/i,
  /instrumental/i,
  /8d audio/i,
  /nightcore/i,
  /lyrics/i,
  /official audio/i,
];

export function buildSourceKey(metadata: TrackMetadata): string {
  const parts = [
    metadata.isrc ?? "",
    metadata.title.toLowerCase().trim(),
    metadata.artist?.toLowerCase().trim() ?? "",
  ];
  return parts.join("|");
}

export function buildSearchQuery(metadata: TrackMetadata): string {
  if (metadata.isrc) {
    return metadata.isrc;
  }
  const artist = metadata.artist ? `${metadata.artist} ` : "";
  return `${artist}${metadata.title} official audio`.trim();
}

export function scoreCandidate(
  metadata: TrackMetadata,
  candidate: YoutubeCandidate,
): number {
  let score = 50;

  const metaTitle = metadata.title.toLowerCase();
  const metaArtist = (metadata.artist ?? "").toLowerCase();
  const candTitle = candidate.title.toLowerCase();
  const candChannel = candidate.channelTitle.toLowerCase();

  if (candTitle.includes(metaTitle) || metaTitle.includes(candTitle.slice(0, 20))) {
    score += 25;
  }

  if (metaArtist && (candTitle.includes(metaArtist) || candChannel.includes(metaArtist))) {
    score += 20;
  }

  if (
    metadata.durationMs &&
    candidate.durationMs &&
    Math.abs(metadata.durationMs - candidate.durationMs) <= DURATION_TOLERANCE_MS
  ) {
    score += 15;
  } else if (
    metadata.durationMs &&
    candidate.durationMs &&
    Math.abs(metadata.durationMs - candidate.durationMs) > DURATION_TOLERANCE_MS * 3
  ) {
    score -= 20;
  }

  for (const pattern of PENALTY_PATTERNS) {
    if (pattern.test(candidate.title) && !pattern.test(metadata.title)) {
      score -= 8;
    }
  }

  if (/official/i.test(candidate.title) || /vevo/i.test(candChannel)) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

export function rankCandidates(
  metadata: TrackMetadata,
  candidates: YoutubeCandidate[],
): YoutubeCandidate[] {
  return [...candidates]
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(metadata, candidate),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);
}

export function resolveFromCandidates(
  metadata: TrackMetadata,
  candidates: YoutubeCandidate[],
): ResolutionResult {
  if (candidates.length === 0) {
    return { videoId: null, confidence: 0, alternates: [] };
  }

  const ranked = rankCandidates(metadata, candidates);
  const scores = ranked.map((c) => scoreCandidate(metadata, c));
  const topScore = scores[0] ?? 0;
  const alternates = ranked.slice(0, 3);

  return {
    videoId: topScore >= RESOLUTION_PROMPT_THRESHOLD ? ranked[0]!.videoId : null,
    confidence: topScore,
    alternates,
    matchedTitle: ranked[0]?.title,
  };
}

export function shouldAutoQueue(confidence: number): boolean {
  return confidence >= RESOLUTION_AUTO_QUEUE_THRESHOLD;
}

export function needsUserPick(confidence: number): boolean {
  return (
    confidence >= RESOLUTION_PROMPT_THRESHOLD &&
    confidence < RESOLUTION_AUTO_QUEUE_THRESHOLD
  );
}

export interface YouTubeSearchClient {
  search(query: string, maxResults?: number): Promise<YoutubeCandidate[]>;
}

export async function resolveTrack(
  metadata: TrackMetadata,
  client: YouTubeSearchClient,
): Promise<ResolutionResult> {
  const query = buildSearchQuery(metadata);
  const candidates = await client.search(query, 10);
  return resolveFromCandidates(metadata, candidates);
}

export function parseYouTubeVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function parseYouTubePlaylistId(input: string): string | null {
  const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
