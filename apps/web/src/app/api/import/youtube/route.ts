import { NextResponse } from "next/server";
import { getYouTubeClient, importYouTubeUrl } from "@/lib/youtube";
import { parseYouTubePlaylistId, parseYouTubeVideoId } from "@together/track-resolver";
import { z } from "zod";

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
  const body = schema.parse(await request.json());
  const input = (body.url ?? body.query ?? "").trim();

  if (!input) {
    return NextResponse.json({ error: "Enter a YouTube URL or search term" }, { status: 400 });
  }

  if (isYouTubeUrl(input)) {
    const items = await importYouTubeUrl(input);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Could not import that YouTube link. Check the URL or API key." },
        { status: 404 },
      );
    }
    return NextResponse.json(items);
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
    if (results.length === 0) {
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    return NextResponse.json(
      results.map((item) => ({
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
