import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminAuditLog } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const entries = await listAdminAuditLog();
  return NextResponse.json({ entries });
}
