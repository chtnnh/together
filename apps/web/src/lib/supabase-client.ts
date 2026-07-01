import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./supabase-config";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!isSupabaseConfigured() || !url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.",
    );
  }
  return createBrowserClient(url, key);
}
