import { NextResponse } from "next/server";
import { getPlaylistWithItems } from "@/lib/rooms";
import { getSupabaseServerUser } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSupabaseServerUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const playlist = await getPlaylistWithItems(id);
  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(playlist);
}
