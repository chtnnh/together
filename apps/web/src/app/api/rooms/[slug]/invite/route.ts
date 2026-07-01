import { NextResponse } from "next/server";
import { getRoomBySlug } from "@/lib/rooms";
import { signRoomToken } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const roomUrl = `${origin}/r/${slug}`;

  if (room.privacy === "private") {
    const token = await signRoomToken(room.id, slug);
    const inviteUrl = `${origin}/r/${slug}/join?token=${encodeURIComponent(token)}`;
    return NextResponse.json({
      slug,
      privacy: room.privacy,
      roomUrl,
      inviteUrl,
    });
  }

  return NextResponse.json({
    slug,
    privacy: room.privacy,
    roomUrl,
    inviteUrl: roomUrl,
  });
}
