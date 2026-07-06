import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminRooms } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const rooms = await listAdminRooms();
  return NextResponse.json({ rooms });
}
