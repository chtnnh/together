import { NextResponse } from "next/server";
import { listOwnedRooms } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
