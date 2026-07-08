import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}
