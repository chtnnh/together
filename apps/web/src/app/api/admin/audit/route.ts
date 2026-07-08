import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminAuditLog } from "@/lib/admin-data";

export const GET = withApiHandler("GET /api/admin/audit", async (log) => {
  const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
  if (auth.error) return auth.error;

  try {
    const entries = await log.span("listAdminAuditLog", () => listAdminAuditLog());
    return NextResponse.json({ entries });
  } catch (err) {
    log.error("GET /api/admin/audit failed:", err);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
});
