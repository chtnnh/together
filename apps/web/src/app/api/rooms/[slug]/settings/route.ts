import { NextResponse } from "next/server";
import { updateRoomSettings, getRoomBySlug, isMemoryStoreEnabled } from "@/lib/rooms";
import { roomSettingsSchema } from "@together/shared";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(room.settings);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = roomSettingsSchema.partial().parse(await request.json());

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (room.ownerUserId && user?.id !== room.ownerUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await updateRoomSettings(room.id, body);
  return NextResponse.json(updated?.settings ?? body);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (isMemoryStoreEnabled()) {
    const memRoom = room as { ownerUserId?: string | null };
    memRoom.ownerUserId = user.id;
    return NextResponse.json({ ok: true });
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();

  await db
    .update(rooms)
    .set({ ownerUserId: user.id })
    .where(eq(rooms.id, room.id));

  return NextResponse.json({ ok: true });
}
