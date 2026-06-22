import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSpotifyPlaylists, getSpotifyPlaylistTracks } from "@/lib/spotify";
import { resolveTrackWithCache } from "@/lib/youtube";
import { shouldAutoQueue } from "@together/track-resolver";
import { savePlaylist } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("spotify_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const playlists = await getSpotifyPlaylists(token);
  return NextResponse.json(playlists);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("spotify_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { playlistId, save } = (await request.json()) as {
    playlistId: string;
    save?: boolean;
  };

  const tracks = await getSpotifyPlaylistTracks(token, playlistId);
  const resolved = [];

  for (const track of tracks) {
    const result = await resolveTrackWithCache({
      source: "spotify",
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      isrc: track.isrc,
      externalId: track.externalId,
    });

    resolved.push({
      source: "spotify" as const,
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      externalId: track.externalId,
      isrc: track.isrc,
      videoId: shouldAutoQueue(result.confidence) ? result.videoId : null,
      confidence: result.confidence,
      alternates: result.alternates,
    });
  }

  if (save) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
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

  return NextResponse.json(resolved);
}
