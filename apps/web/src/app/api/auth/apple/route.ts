import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { cookies } from "next/headers";
import { generateAppleMusicToken } from "@/lib/apple-music";

export const GET = withApiHandler("GET /api/auth/apple", async (_log, request) => {
  const url = new URL(request.url);
  const room = url.searchParams.get("room") ?? "";

  const cookieStore = await cookies();
  if (room) cookieStore.set("apple_oauth_room", room, { httpOnly: true, maxAge: 600 });

  try {
    const developerToken = await generateAppleMusicToken();
    return NextResponse.json({ developerToken, room });
  } catch {
    return NextResponse.redirect("/?error=apple_not_configured");
  }
});
