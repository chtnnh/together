import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { isAppleMusicConfigured } from "@/lib/apple-music";
import { isSpotifyConfigured } from "@/lib/spotify";

export const GET = withApiHandler("GET /api/import/services", async (_log) => {
  return NextResponse.json({
    spotify: isSpotifyConfigured(),
    soundcloud: !!process.env.SOUNDCLOUD_CLIENT_ID?.trim(),
    apple: isAppleMusicConfigured(),
  });
});
