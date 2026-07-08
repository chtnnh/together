import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getRoomBySlug, verifyRoomPassword } from "@/lib/rooms";
import {
  cookieOptions,
  roomAccessCookieName,
  roomPasswordCookieName,
} from "@/lib/room-access";
import { verifyRoomToken } from "@/lib/utils";

/** Private rooms — verify password or invite token and set session cookie */
export const POST = withApiHandler(
  "POST /api/rooms/[slug]/access",
  async (_log, request, context) => {
    const { slug } = await context!.params!;
    const body = (await request.json()) as { password?: string; token?: string };

    const room = await getRoomBySlug(slug);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.privacy !== "private") {
      return NextResponse.json({ ok: true });
    }

    if (body.token) {
      const verified = await verifyRoomToken(body.token);
      if (!verified || verified.slug !== slug) {
        return NextResponse.json({ error: "Invalid invite link" }, { status: 401 });
      }

      const response = NextResponse.json({ ok: true });
      response.cookies.set(
        roomAccessCookieName(slug),
        body.token,
        cookieOptions(`/r/${slug}`),
      );
      return response;
    }

    if (!room.passwordHash) {
      return NextResponse.json({ ok: true });
    }

    if (!body.password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const valid = await verifyRoomPassword(slug, body.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(roomPasswordCookieName(slug), "1", cookieOptions(`/r/${slug}`));
    return response;
  },
);
