import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
