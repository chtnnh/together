import { NextResponse } from "next/server";
import {
  getAppleMusicPlaylists,
  getAppleMusicPlaylistTracks,
} from "@/lib/apple-music";
import { resolveTrackWithCache } from "@/lib/youtube";
import { shouldAutoQueue } from "@together/track-resolver";
import { savePlaylist } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { userToken, playlistId, save } = (await request.json()) as {
    userToken: string;
    playlistId?: string;
    save?: boolean;
  };

  if (!userToken) {
    return NextResponse.json({ error: "User token required" }, { status: 400 });
  }

  if (!playlistId) {
    const playlists = await getAppleMusicPlaylists(userToken);
    return NextResponse.json(playlists);
  }

  const tracks = await getAppleMusicPlaylistTracks(userToken, playlistId);
  const resolved = [];

  for (const track of tracks) {
    const result = await resolveTrackWithCache({
      source: "apple",
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      isrc: track.isrc,
      externalId: track.externalId,
    });

    resolved.push({
      source: "apple" as const,
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
        name: `Apple Music Import ${new Date().toLocaleDateString()}`,
        source: "apple",
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
