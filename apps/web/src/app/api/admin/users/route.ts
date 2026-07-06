import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}
