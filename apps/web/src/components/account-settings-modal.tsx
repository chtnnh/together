"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import Link from "next/link";
import { useAuthConfig } from "@/components/auth-config-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
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
  const { configured, url, anonKey } = useAuthConfig();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !configured) return;
    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        if (data.user?.email) setEmail(data.user.email);
      });
    } catch {
      // Handled by configured gate.
    }
  }, [open, configured, url, anonKey]);

  if (!open) return null;

  const authRedirectTo = (next: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const handleGoogleSignIn = async () => {
    if (!configured) return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectTo(window.location.pathname) },
      });
      if (error) setMessage(error.message);
    } catch {
      setMessage("Could not start Google sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setMessage("Sign-in isn't available on this server.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authRedirectTo(window.location.pathname) },
      });
      setMessage(error ? error.message : "Check your email for a sign-in link!");
    } catch {
      setMessage("Could not send sign-in link. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!configured) return;
    const supabase = createSupabaseBrowserClient(url, anonKey);
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

        <div className="mt-4 space-y-3 z-[130]">
          <div>
            <Label className="mb-2 block text-sm font-medium">Theme</Label>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Applies across the app</p>
            <ThemeSelector
              className="w-full"
              value={userPrefs.theme}
              onChange={(theme) => onUserPrefsUpdate({ theme })}
            />
          </div>

          {user ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                Signed in as <span className="text-[var(--text)]">{user.email}</span>
              </p>
              <Link href="/playlists" onClick={onClose} className="block">
                <Button variant="secondary" className="w-full">
                  View playlists
                </Button>
              </Link>
              <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : !configured ? (
            <p className="text-sm text-[var(--text-muted)]">
              Sign-in isn&apos;t available on this server. You can still listen in rooms without an account.
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                Optional account to save playlists and room settings.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </Button>
              <form onSubmit={handleMagicLink} className="space-y-3">
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
            </>
          )}

          {message && <p className="text-sm text-[var(--text-muted)]">{message}</p>}

          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
