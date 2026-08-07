import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/admin-data";
import { withApiHandler } from "@/lib/api-log";

export const GET = withApiHandler("GET /api/admin/stats", async (log) => {
  const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
  if (auth.error) return auth.error;

  try {
    const stats = await log.span("getAdminStats", () => getAdminStats());
    return NextResponse.json(stats);
  } catch (err) {
    log.error("GET /api/admin/stats failed:", err);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
});
