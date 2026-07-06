import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAppleMusicPlaylistTracks,
  getAppleMusicPlaylists,
  getCatalogPlaylistTracks,
  isAppleMusicConfigured,
  parseAppleMusicPlaylistUrl,
} from "@/lib/apple-music";
import { resolveImportTracks } from "@/lib/import-tracks";
import { savePlaylist } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";

const importRateLimit = {
  name: "import:apple",
  limit: 30,
  windowMs: 60 * 1000,
};

const urlSchema = z.object({ url: z.string().min(1) });

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, importRateLimit);
  if (limited) return limited;

  const body = await request.json();

  if ("url" in body && typeof body.url === "string") {
    if (!isAppleMusicConfigured()) {
      return NextResponse.json({ error: "Apple Music import is not configured" }, { status: 503 });
    }

    try {
      const { url } = urlSchema.parse(body);
      const parsed = parseAppleMusicPlaylistUrl(url);
      if (!parsed) {
        return NextResponse.json(
          { error: "Enter a valid public Apple Music playlist URL" },
          { status: 400 },
        );
      }

      const tracks = await getCatalogPlaylistTracks(parsed.storefront, parsed.id);
      if (tracks.length === 0) {
        return NextResponse.json({ error: "No tracks found in that playlist" }, { status: 404 });
      }

      const resolved = await resolveImportTracks(tracks, "apple");
      return NextResponse.json(resolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apple Music import failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const { userToken, playlistId, save } = body as {
    userToken?: string;
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
  const resolved = await resolveImportTracks(tracks, "apple");

  if (save) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
