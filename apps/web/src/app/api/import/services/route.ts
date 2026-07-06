import { NextResponse } from "next/server";
import { isAppleMusicConfigured } from "@/lib/apple-music";
import { isSpotifyConfigured } from "@/lib/spotify";

export async function GET() {
  return NextResponse.json({
    spotify: isSpotifyConfigured(),
    soundcloud: !!process.env.SOUNDCLOUD_CLIENT_ID?.trim(),
    apple: isAppleMusicConfigured(),
  });
}
