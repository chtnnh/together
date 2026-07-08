import "server-only";

import { loadRootEnv } from "@/lib/supabase/load-root-env";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseEnvConfigured,
} from "@/lib/supabase/env";
import type { SupabasePublicConfig } from "@/lib/supabase/types";

export type { SupabasePublicConfig };

/** Read Supabase public config on the server. */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  loadRootEnv();
  return {
    configured: isSupabaseEnvConfigured(),
    url: getSupabaseUrl(),
    anonKey: getSupabasePublishableKey(),
  };
}
