"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useAuthConfig } from "@/components/auth-config-provider";

export function useSupabaseUser() {
  const { configured, url, anonKey } = useAuthConfig();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id ?? null);
        setEmail(data.user?.email ?? null);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user?.id ?? null);
        setEmail(session?.user?.email ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch {
      setLoading(false);
    }
  }, [configured, url, anonKey]);

  return { userId, email, loading, signedIn: !!userId };
}
