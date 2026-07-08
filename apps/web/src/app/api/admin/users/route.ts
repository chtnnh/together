import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/admin/users failed:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
