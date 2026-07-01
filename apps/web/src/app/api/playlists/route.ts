import { NextResponse } from "next/server";
import {
  getUserPlaylists,
  savePlaylist,
} from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const playlists = await getUserPlaylists(user.id);
    return NextResponse.json(playlists);
  } catch (err) {
    console.error("GET /api/playlists failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load playlists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const saveSchema = z.object({
  name: z.string().trim().min(1).max(128),
  source: z.enum(["spotify", "apple", "youtube", "mixed"]),
  items: z.array(
    z.object({
      source: z.enum(["youtube", "spotify", "apple", "manual"]),
      title: z.string().min(1),
      artist: z.string().optional(),
      durationMs: z.number().finite().optional(),
      externalId: z.string().optional(),
      isrc: z.string().optional(),
      resolvedYoutubeId: z.string().optional(),
      confidence: z.number().finite().optional(),
      alternates: z.unknown().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = saveSchema.parse(await request.json());
    const playlist = await savePlaylist({
      userId: user.id,
      email: user.email,
      name: body.name,
      source: body.source,
      items: body.items,
    });

    return NextResponse.json(playlist);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid playlist data", details: err.flatten() },
        { status: 400 },
      );
    }
    console.error("POST /api/playlists failed:", err);
    const message = err instanceof Error ? err.message : "Failed to save playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
