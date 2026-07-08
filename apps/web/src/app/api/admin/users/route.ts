import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-data";

export const GET = withApiHandler("GET /api/admin/users", async (log) => {
  const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
  if (auth.error) return auth.error;

  try {
    const users = await log.span("listAdminUsers", () => listAdminUsers());
    return NextResponse.json({ users });
  } catch (err) {
    log.error("GET /api/admin/users failed:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
});
