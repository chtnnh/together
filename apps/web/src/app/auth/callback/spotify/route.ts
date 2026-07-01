// TODO(v0.3): Spotify OAuth callback — UI not linked until import flow is production-ready.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exchangeSpotifyCode } from "@/lib/spotify";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    redirect("/?error=spotify_auth_failed");
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("spotify_oauth_state")?.value;
  const room = cookieStore.get("spotify_oauth_room")?.value ?? "";

  if (state !== savedState) {
    redirect("/?error=spotify_auth_failed");
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/spotify`;

  try {
    const tokens = await exchangeSpotifyCode(code, redirectUri);
    cookieStore.set("spotify_access_token", tokens.access_token, {
      httpOnly: true,
      maxAge: tokens.expires_in,
    });
    cookieStore.delete("spotify_oauth_state");
  } catch {
    redirect("/?error=spotify_auth_failed");
  }

  redirect(`/import/spotify${room ? `?room=${room}` : ""}`);
}
