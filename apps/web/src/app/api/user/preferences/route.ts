import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { getUserPreferences, saveUserPreferences } from "@/lib/rooms";
import { formatPublicDbError } from "@/lib/db-errors";
import { getSupabaseServerUser } from "@/lib/supabase-server";
import { userAccountPreferencesSchema } from "@together/shared";
import { z } from "zod";

export const GET = withApiHandler("GET /api/user/preferences", async (log) => {
  try {
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const preferences = await getUserPreferences(user.id);
    return NextResponse.json(preferences ?? {});
  } catch (err) {
    log.error("GET /api/user/preferences failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Failed to load preferences") },
      { status: 500 },
    );
  }
});

export const PATCH = withApiHandler("PATCH /api/user/preferences", async (log, request) => {
  try {
    const user = await getSupabaseServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = userAccountPreferencesSchema.parse(await request.json());
    const saved = await saveUserPreferences(user.id, user.email, body);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }
    log.error("PATCH /api/user/preferences failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Failed to save preferences") },
      { status: 500 },
    );
  }
});
