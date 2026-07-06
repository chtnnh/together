import { NextResponse } from "next/server";
import { isUserGloballyBanned } from "@/lib/admin-data";

function authorizeInternalSync(request: Request): boolean {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorizeInternalSync(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const banned = await isUserGloballyBanned(id);
  return NextResponse.json({ banned });
}
