import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getPlaylistWithItems } from "@/lib/rooms";
import { getSupabaseServerUser } from "@/lib/supabase-server";

export const GET = withApiHandler(
  "GET /api/playlists/[id]",
  async (_log, _request, context) => {
    const { id } = await context!.params!;
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const playlist = await getPlaylistWithItems(id);
    if (!playlist || playlist.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(playlist);
  },
);
