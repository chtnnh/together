"use client";

import { createContext, useContext, useMemo } from "react";
import type { SupabasePublicConfig } from "@/lib/supabase/types";

const AuthConfigContext = createContext<SupabasePublicConfig>({
  configured: false,
  url: "",
  anonKey: "",
});

export function AuthConfigProvider({
  config,
  children,
}: {
  config: SupabasePublicConfig;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      configured: config.configured,
      url: config.url,
      anonKey: config.anonKey,
    }),
    [config.configured, config.url, config.anonKey],
  );

  return <AuthConfigContext.Provider value={value}>{children}</AuthConfigContext.Provider>;
}

export function useAuthConfig(): SupabasePublicConfig {
  return useContext(AuthConfigContext);
}
