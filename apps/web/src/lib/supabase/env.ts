/** Shared Supabase env resolution (supports legacy anon + new publishable key names). */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export function isSupabaseEnvConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
