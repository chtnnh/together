import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { isMemoryStoreEnabled } from "@/lib/rooms";

export const GET = withApiHandler("GET /api/health/db", async (_log) => {
  if (isMemoryStoreEnabled()) {
    return NextResponse.json({
      ok: true,
      mode: "memory",
      message: "DATABASE_URL not set — using in-memory rooms",
    });
  }

  try {
    const { getDb, rooms } = await import("@together/db");
    const db = getDb();
    await db.select({ slug: rooms.slug }).from(rooms).limit(1);
    return NextResponse.json({ ok: true, mode: "postgres" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database check failed";
    return NextResponse.json({ ok: false, mode: "postgres", error: message }, { status: 503 });
  }
});
