import { NextResponse } from "next/server";
import { addRoomBan, getRoomBanIds, getRoomBySlug } from "@/lib/rooms";
import { z } from "zod";

function authorizeInternalSync(request: Request): boolean {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(
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

  const bans = await getRoomBanIds(room.id);
  return NextResponse.json({ bans });
}

const banSchema = z.object({
  anonId: z.string().min(1),
  userId: z.string().nullable().optional(),
  bannedBy: z.string().nullable().optional(),
});

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

  const body = banSchema.parse(await request.json());
  await addRoomBan({
    roomId: room.id,
    anonId: body.anonId,
    userId: body.userId,
    bannedBy: body.bannedBy,
  });
  return NextResponse.json({ ok: true });
}
