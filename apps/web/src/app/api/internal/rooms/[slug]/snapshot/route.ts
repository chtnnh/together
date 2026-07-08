import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getRoomBySlug, saveRoomSnapshot } from "@/lib/rooms";
import { roomLiveSnapshotSchema } from "@together/shared";

function authorizeInternalSync(request: Request): boolean {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export const POST = withApiHandler(
  "POST /api/internal/rooms/[slug]/snapshot",
  async (_log, request, context) => {
    if (!authorizeInternalSync(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context!.params!;
    const room = await getRoomBySlug(slug);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const snapshot = roomLiveSnapshotSchema.parse(await request.json());
    await saveRoomSnapshot(room.id, snapshot);
    return NextResponse.json({ ok: true });
  },
);
