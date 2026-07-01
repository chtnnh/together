import { NextResponse } from "next/server";
import { getUserPreferences, saveUserPreferences } from "@/lib/rooms";
import { formatPublicDbError } from "@/lib/db-errors";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { userAccountPreferencesSchema } from "@together/shared";
import { z } from "zod";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const preferences = await getUserPreferences(user.id);
    return NextResponse.json(preferences ?? {});
  } catch (err) {
    console.error("GET /api/user/preferences failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Failed to load preferences") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    console.error("PATCH /api/user/preferences failed:", err);
    return NextResponse.json(
      { error: formatPublicDbError(err, "Failed to save preferences") },
      { status: 500 },
    );
  }
}
