// TODO(v0.3): Spotify OAuth — UI not linked until import flow is production-ready.
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getSpotifyAuthUrl } from "@/lib/spotify";
import { cookies } from "next/headers";

export const GET = withApiHandler("GET /api/auth/spotify", async (_log, request) => {
  const url = new URL(request.url);
  const room = url.searchParams.get("room") ?? "";
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("spotify_oauth_state", state, { httpOnly: true, maxAge: 600 });
  if (room) cookieStore.set("spotify_oauth_room", room, { httpOnly: true, maxAge: 600 });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/spotify`;
  const authUrl = getSpotifyAuthUrl(redirectUri, state);

  return NextResponse.redirect(authUrl);
});
