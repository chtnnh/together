import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/rooms";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { loadRootEnv } from "@/lib/supabase/load-root-env";

export async function GET(request: Request) {
  loadRootEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${url.origin}/?auth=failed`);
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${url.origin}/?auth=failed`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth callback:", error.message);
    return NextResponse.redirect(`${url.origin}/?auth=failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureUser(user.id, user.email);
    } catch (err) {
      console.error("ensureUser after sign-in:", err);
    }
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${url.origin}${safeNext}`);
}
