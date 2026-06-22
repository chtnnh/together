import { NextResponse } from "next/server";
import { getRoomBySlug, verifyRoomPassword } from "@/lib/rooms";
import { roomPasswordCookieName, cookieOptions } from "@/lib/room-access";

/** Private rooms only — verify password and set session cookie */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json()) as { password?: string };

  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.privacy !== "private" || !room.passwordHash) {
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
}
