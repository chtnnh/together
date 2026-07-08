import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { createRoom } from "@/lib/rooms";
import { roomPasswordCookieName, cookieOptions } from "@/lib/room-access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const createRoomRateLimit = {
  name: "rooms:create",
  limit: 10,
  windowMs: 60 * 60 * 1000,
};

const createRoomSchema = z.object({
  displayName: z.string().min(1).max(24),
  title: z.string().min(1).max(64).trim().optional(),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/).optional(),
  privacy: z.enum(["public", "unlisted", "private"]).default("unlisted"),
  password: z.string().min(4).max(64).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const POST = withApiHandler("POST /api/rooms", async (log, request) => {
  const limited = enforceRateLimit(request, createRoomRateLimit);
  if (limited) return limited;

  try {
    const body = createRoomSchema.parse(await request.json());

    const room = await createRoom({
      slug: body.slug,
      title: body.title,
      displayName: body.displayName,
      privacy: body.privacy,
      password: body.password,
      settings: body.settings as Record<string, unknown> | undefined,
    });

    const response = NextResponse.json({
      id: room.id,
      slug: room.slug,
      title: "title" in room ? room.title : null,
      privacy: room.privacy,
    });

    if (body.privacy === "private" && body.password) {
      response.cookies.set(
        roomPasswordCookieName(room.slug),
        "1",
        cookieOptions(`/r/${room.slug}`),
      );
    }

    return response;
  } catch (err) {
    log.error("create room failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const GET = withApiHandler("GET /api/rooms", async (_log) => {
  return NextResponse.json({ service: "together-rooms" });
});
