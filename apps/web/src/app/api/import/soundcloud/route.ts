// SoundCloud import — public playlist/track URLs via client ID.
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { importSoundCloudUrl } from "@/lib/soundcloud";
import { resolveImportTracks } from "@/lib/import-tracks";
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

export const POST = withApiHandler("POST /api/import/soundcloud", async (_log, request) => {
  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  try {
    const { url } = schema.parse(await request.json());
    const tracks = await importSoundCloudUrl(url);
    const resolved = await resolveImportTracks(tracks, "manual");

    if (resolved.length === 0) {
      return NextResponse.json({ error: "No tracks found at that SoundCloud URL" }, { status: 404 });
    }

    return NextResponse.json(resolved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "SoundCloud import failed";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
});
