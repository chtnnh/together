import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getRoomBySlug, updateRoomTitle } from "@/lib/rooms";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(64).trim(),
});

export const PATCH = withApiHandler(
  "PATCH /api/rooms/[slug]",
  async (_log, request, context) => {
    const { slug } = await context!.params!;
    const room = await getRoomBySlug(slug);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body = updateSchema.parse(await request.json());
    const updated = await updateRoomTitle(room.id, body.title);

    if (!updated) {
      return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }

    return NextResponse.json({
      title: "title" in updated ? updated.title : body.title,
    });
  },
);
