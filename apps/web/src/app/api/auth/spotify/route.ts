import { NextResponse } from "next/server";
import { getSpotifyAuthUrl } from "@/lib/spotify";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const room = url.searchParams.get("room") ?? "";
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("spotify_oauth_state", state, { httpOnly: true, maxAge: 600 });
  if (room) cookieStore.set("spotify_oauth_room", room, { httpOnly: true, maxAge: 600 });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/spotify`;
  const authUrl = getSpotifyAuthUrl(redirectUri, state);

  return NextResponse.redirect(authUrl);
}
