import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { isUserGloballyBanned } from "@/lib/admin-data";

function authorizeInternalSync(request: Request): boolean {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export const GET = withApiHandler(
  "GET /api/internal/users/[id]/banned",
  async (_log, request, context) => {
    if (!authorizeInternalSync(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context!.params!;
    const banned = await isUserGloballyBanned(id);
    return NextResponse.json({ banned });
  },
);
