"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { ThemeSelector } from "@/components/theme-selector";
import type { UserPreferences } from "@/hooks/use-user-preferences";

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  userPrefs: UserPreferences;
  onUserPrefsUpdate: (prefs: Partial<UserPreferences>) => void;
}

export function AccountSettingsModal({
  open,
  onClose,
  userPrefs,
  onUserPrefsUpdate,
}: AccountSettingsModalProps) {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!open || !supabaseConfigured) return;
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        if (data.user?.email) setEmail(data.user.email);
      });
    } catch {
      // Handled by supabaseConfigured gate.
    }
  }, [open, supabaseConfigured]);

  if (!open) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      setMessage("Sign-in is not configured.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      setMessage(error ? error.message : "Check your email for a sign-in link!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not reach Supabase");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMessage("Signed out");
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl"
        role="dialog"
        aria-labelledby="account-settings-title"
      >
        <h2 id="account-settings-title" className="text-lg font-semibold">
          Account
        </h2>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <p className="text-xs text-[var(--text-muted)]">Applies across the app</p>
          </div>
          <ThemeSelector
            value={userPrefs.theme}
            onChange={(theme) => onUserPrefsUpdate({ theme })}
          />
        </div>

        {user ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Signed in as <span className="text-[var(--text)]">{user.email}</span>
            </p>
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : !supabaseConfigured ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Sign-in requires Supabase env vars. Anonymous use works without an account.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="mt-4 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Optional account to save playlists and room settings.
            </p>
            <div>
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}

        {message && <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p>}

        <Button type="button" variant="secondary" className="mt-6 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
