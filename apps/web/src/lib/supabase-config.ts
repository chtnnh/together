import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseEnvConfigured } from "@/lib/supabase/env";

/** Server-side check. Client components should use `useAuthConfig()`. */
export function isSupabaseConfigured(): boolean {
  return isSupabaseEnvConfigured();
}
