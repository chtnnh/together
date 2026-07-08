import { NextResponse } from "next/server";
import { listOwnedRooms } from "@/lib/rooms";
import { getSupabaseServerUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getSupabaseServerUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const rooms = await listOwnedRooms(user.id);
  return NextResponse.json(
    rooms.map((room) => ({
      slug: room.slug,
      title: room.title ?? room.slug,
      privacy: room.privacy,
      createdAt: room.createdAt,
    })),
  );
}
