import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAbuseSignals } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  try {
    const signals = await listAbuseSignals();
    return NextResponse.json(signals);
  } catch (err) {
    console.error("GET /api/admin/abuse failed:", err);
    return NextResponse.json({ error: "Failed to load abuse signals" }, { status: 500 });
  }
}
