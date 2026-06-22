import { NextResponse } from "next/server";
import { verifyRoomPassword, getRoomBySlug } from "@/lib/rooms";
import {
  PASSWORD_LOCKOUT_ATTEMPTS,
  PASSWORD_LOCKOUT_MINUTES,
} from "@together/shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { password } = (await request.json()) as { password: string };

  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!room.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  // Simple in-memory style check - in production use passwordAttempts table
  const valid = await verifyRoomPassword(slug, password);
  if (!valid) {
    return NextResponse.json(
      {
        error: "Invalid password",
        attemptsRemaining: PASSWORD_LOCKOUT_ATTEMPTS,
        lockoutMinutes: PASSWORD_LOCKOUT_MINUTES,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, ip });
}
