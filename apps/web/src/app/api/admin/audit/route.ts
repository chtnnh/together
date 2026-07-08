import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminAuditLog } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  try {
    const entries = await listAdminAuditLog();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("GET /api/admin/audit failed:", err);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
