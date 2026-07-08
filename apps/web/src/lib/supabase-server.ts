import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { runSpan } from "@/lib/api-log";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { loadRootEnv } from "@/lib/supabase/load-root-env";

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  loadRootEnv();
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component — session refresh is handled by middleware.
        }
      },
    },
  });
}

export async function getSupabaseServerUser(): Promise<User | null> {
  return runSpan("supabase", "getUser", async () => {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  });
}
