import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminRooms } from "@/lib/admin-data";

export const GET = withApiHandler("GET /api/admin/rooms", async (log) => {
  const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
  if (auth.error) return auth.error;

  try {
    const rooms = await log.span("listAdminRooms", () => listAdminRooms());
    return NextResponse.json({ rooms });
  } catch (err) {
    log.error("GET /api/admin/rooms failed:", err);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
});
