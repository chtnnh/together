import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  getPublicSpotifyPlaylistTracks,
  getPublicSpotifyPlaylistDetails,
  getSpotifyPlaylistTracks,
  isSpotifyConfigured,
  isSpotifyOAuthEnabled,
  parseSpotifyPlaylistUrl,
} from "@/lib/spotify";
import { resolveImportTracks } from "@/lib/import-tracks";
import { savePlaylist } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";

const importRateLimit = {
  name: "import:spotify",
  limit: 30,
  windowMs: 60 * 1000,
};

const urlSchema = z.object({ url: z.string().min(1) });
const oauthSchema = z.object({
  playlistId: z.string().min(1),
  save: z.boolean().optional(),
});

export async function GET(request: Request) {
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: "Spotify OAuth is disabled" }, { status: 404 });
  }

  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  const cookieStore = await cookies();
  const token = cookieStore.get("spotify_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { getSpotifyPlaylists } = await import("@/lib/spotify");
  const playlists = await getSpotifyPlaylists(token);
  return NextResponse.json(playlists);
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  const body = await request.json();

  if ("url" in body && typeof body.url === "string") {
    if (!isSpotifyConfigured()) {
      return NextResponse.json({ error: "Spotify import is not configured" }, { status: 503 });
    }

    try {
      const { url } = urlSchema.parse(body);
      const playlistId = parseSpotifyPlaylistUrl(url);
      if (!playlistId) {
        return NextResponse.json(
          { error: "Enter a valid public Spotify playlist URL" },
          { status: 400 },
        );
      }

      const tracks = await getPublicSpotifyPlaylistTracks(playlistId);
      if (tracks.length === 0) {
        return NextResponse.json({ error: "No tracks found in that playlist" }, { status: 404 });
      }

      const details = await getPublicSpotifyPlaylistDetails(playlistId);
      const resolved = await resolveImportTracks(tracks, "spotify");
      return NextResponse.json({
        kind: "playlist",
        title: details?.title ?? "Spotify Playlist",
        artist: details?.artist,
        thumbnailUrl: details?.thumbnailUrl,
        videoCount: resolved.length,
        tracks: resolved,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Spotify import failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json(
      { error: "Paste a public Spotify playlist URL to import" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("spotify_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { playlistId, save } = oauthSchema.parse(body);
  const tracks = await getSpotifyPlaylistTracks(token, playlistId);
  const resolved = await resolveImportTracks(tracks, "spotify");

  if (save) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await savePlaylist({
          userId: user.id,
          name: `Spotify Import ${new Date().toLocaleDateString()}`,
          source: "spotify",
          items: resolved.map((r) => ({
            source: r.source,
            title: r.title,
            artist: r.artist,
            durationMs: r.durationMs,
            externalId: r.externalId,
            isrc: r.isrc,
            resolvedYoutubeId: r.videoId ?? undefined,
            confidence: r.confidence,
            alternates: r.alternates,
          })),
        });
      }
    }
  }

  return NextResponse.json(resolved);
}
