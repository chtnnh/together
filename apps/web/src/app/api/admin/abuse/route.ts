import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAbuseSignals } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const signals = await listAbuseSignals();
  return NextResponse.json(signals);
}
