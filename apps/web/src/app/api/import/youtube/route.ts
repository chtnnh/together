import { NextResponse } from "next/server";
import { getYouTubeClient, importYouTubeUrl } from "@/lib/youtube";
import { parseYouTubePlaylistId, parseYouTubeVideoId } from "@together/track-resolver";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const importRateLimit = {
  name: "import:youtube",
  limit: 30,
  windowMs: 60 * 1000,
};

const schema = z.object({
  url: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
});

function isYouTubeUrl(input: string): boolean {
  return (
    /youtube\.com|youtu\.be/.test(input) ||
    parseYouTubeVideoId(input) !== null ||
    parseYouTubePlaylistId(input) !== null
  );
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  const body = schema.parse(await request.json());
  const input = (body.url ?? body.query ?? "").trim();

  if (!input) {
    return NextResponse.json({ error: "Enter a YouTube URL or search term" }, { status: 400 });
  }

  if (isYouTubeUrl(input)) {
    const result = await importYouTubeUrl(input);
    const empty = !result || (Array.isArray(result) && result.length === 0);
    if (empty) {
      return NextResponse.json(
        {
          error: parseYouTubeVideoId(input)
            ? "That video is unavailable or has been deleted."
            : "Could not import that YouTube link. Check the URL or API key.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  }

  const client = getYouTubeClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "YouTube search requires YOUTUBE_API_KEY in the repo root .env file. You can still paste a full YouTube URL.",
      },
      { status: 503 },
    );
  }

  try {
    const results = await client.search(input, 8);
    const available = await client.filterAvailableCandidates(results);
    if (available.length === 0) {
      return NextResponse.json({ error: "No available results found" }, { status: 404 });
    }

    return NextResponse.json(
      available.map((item) => ({
        source: "youtube" as const,
        videoId: item.videoId,
        title: item.title,
        artist: item.channelTitle,
        durationMs: item.durationMs,
        thumbnailUrl: item.thumbnailUrl,
        confidence: 100,
      })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "YouTube search failed";
    console.error("YouTube search error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
