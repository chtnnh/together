import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminRooms } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  try {
    const rooms = await listAdminRooms();
    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("GET /api/admin/rooms failed:", err);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}
