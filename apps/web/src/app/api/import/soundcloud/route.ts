import { NextResponse } from "next/server";
import { importSoundCloudUrl } from "@/lib/soundcloud";
import { resolveTrackWithCache } from "@/lib/youtube";
import { shouldAutoQueue } from "@together/track-resolver";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const importRateLimit = {
  name: "import:soundcloud",
  limit: 30,
  windowMs: 60 * 1000,
};

const schema = z.object({
  url: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  try {
    const { url } = schema.parse(await request.json());
    const tracks = await importSoundCloudUrl(url);
    const resolved = [];

    for (const track of tracks) {
      const result = await resolveTrackWithCache({
        source: "manual",
        title: track.title,
        artist: track.artist,
        durationMs: track.durationMs,
        externalId: track.externalId,
      });

      resolved.push({
        source: "manual" as const,
        title: track.title,
        artist: track.artist,
        durationMs: track.durationMs,
        externalId: track.externalId,
        videoId: shouldAutoQueue(result.confidence) ? result.videoId : null,
        confidence: result.confidence,
        alternates: result.alternates,
      });
    }

    if (resolved.length === 0) {
      return NextResponse.json({ error: "No tracks found at that SoundCloud URL" }, { status: 404 });
    }

    return NextResponse.json(resolved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "SoundCloud import failed";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
