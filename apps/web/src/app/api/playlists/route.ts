import { NextResponse } from "next/server";
import {
  getUserPlaylists,
  savePlaylist,
} from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const playlists = await getUserPlaylists(user.id);
  return NextResponse.json(playlists);
}

const saveSchema = z.object({
  name: z.string().min(1).max(128),
  source: z.enum(["spotify", "apple", "youtube", "mixed"]),
  items: z.array(
    z.object({
      source: z.enum(["youtube", "spotify", "apple", "manual"]),
      title: z.string(),
      artist: z.string().optional(),
      durationMs: z.number().optional(),
      externalId: z.string().optional(),
      isrc: z.string().optional(),
      resolvedYoutubeId: z.string().optional(),
      confidence: z.number().optional(),
      alternates: z.unknown().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = saveSchema.parse(await request.json());
  const playlist = await savePlaylist({
    userId: user.id,
    name: body.name,
    source: body.source,
    items: body.items,
  });

  return NextResponse.json(playlist);
}
