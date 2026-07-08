import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin } from "@/lib/admin-auth";
import { listAbuseSignals } from "@/lib/admin-data";

export const GET = withApiHandler("GET /api/admin/abuse", async (log) => {
  const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
  if (auth.error) return auth.error;

  try {
    const signals = await log.span("listAbuseSignals", () => listAbuseSignals());
    return NextResponse.json(signals);
  } catch (err) {
    log.error("GET /api/admin/abuse failed:", err);
    return NextResponse.json({ error: "Failed to load abuse signals" }, { status: 500 });
  }
});
