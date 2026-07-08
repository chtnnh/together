import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getYouTubeApiKey } from "@/lib/youtube-env";

/** Debug: verify YouTube API key is loaded (does not expose the key). */
export const GET = withApiHandler("GET /api/import/youtube/status", async (_log) => {
  const key = getYouTubeApiKey();
  return NextResponse.json({
    configured: !!key,
    keyLength: key?.length ?? 0,
    hint: key
      ? "API key loaded"
      : "Set YOUTUBE_API_KEY in repo root .env and restart the dev server",
  });
});
