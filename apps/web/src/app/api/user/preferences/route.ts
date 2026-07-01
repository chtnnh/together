import { NextResponse } from "next/server";
import { getUserPreferences, saveUserPreferences } from "@/lib/rooms";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { userAccountPreferencesSchema } from "@together/shared";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const preferences = await getUserPreferences(user.id);
  return NextResponse.json(preferences ?? {});
}

export async function PATCH(request: Request) {
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
}
