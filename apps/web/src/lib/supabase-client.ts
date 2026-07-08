import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient(url: string, anonKey: string) {
  if (!url || !anonKey) {
    throw new Error("Sign-in is not available");
  }
  return createBrowserClient(url, anonKey);
}
