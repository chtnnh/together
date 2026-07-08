import { NextResponse } from "next/server";
import {
  updateRoomSettings,
  getRoomBySlug,
  isMemoryStoreEnabled,
  ensureUser,
} from "@/lib/rooms";
import { formatPublicDbError } from "@/lib/db-errors";
import { roomSettingsSchema } from "@together/shared";
import { getSupabaseServerUser } from "@/lib/supabase-server";
import { z } from "zod";

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
  try {
    const { slug } = await params;
    const room = await getRoomBySlug(slug);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body = roomSettingsSchema.partial().parse(await request.json());

    if (room.ownerUserId) {
      const user = await getSupabaseServerUser();
      if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (user.id !== room.ownerUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updated = await updateRoomSettings(room.id, body);
    return NextResponse.json(updated?.settings ?? body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }
    console.error("PATCH /api/rooms/[slug]/settings failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Failed to update room settings") },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
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
      return NextResponse.json({ error: "Room already has an owner" }, { status: 403 });
    }

    if (isMemoryStoreEnabled()) {
      const memRoom = room as { ownerUserId?: string | null };
      memRoom.ownerUserId = user.id;
      return NextResponse.json({ ok: true });
    }

    await ensureUser(user.id, user.email);

    const { getDb, rooms } = await import("@together/db");
    const { eq } = await import("drizzle-orm");
    const db = getDb();

    await db
      .update(rooms)
      .set({ ownerUserId: user.id })
      .where(eq(rooms.id, room.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/rooms/[slug]/settings failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Could not save room to account") },
      { status: 500 },
    );
  }
}
