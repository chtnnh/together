import { NextResponse } from "next/server";
import { getRoomBySlug, transferRoomOwnership } from "@/lib/rooms";
import { getSupabaseServerUser } from "@/lib/supabase-server";
import { z } from "zod";

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const user = await getSupabaseServerUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (room.ownerUserId && room.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Only the room owner can transfer ownership" }, { status: 403 });
  }

  const { targetUserId } = bodySchema.parse(await request.json());

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  const updated = await transferRoomOwnership(room.id, targetUserId);
  if (!updated) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ownerUserId: targetUserId });
}
