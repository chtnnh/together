import { NextResponse } from "next/server";
import { getRoomBySlug, updateRoomSettings } from "@/lib/rooms";
import { roomSettingsSchema } from "@together/shared";

function authorizeInternalSync(request: Request): boolean {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!authorizeInternalSync(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = roomSettingsSchema.parse(await request.json());
  const updated = await updateRoomSettings(room.id, body);
  return NextResponse.json(updated?.settings ?? body);
}
