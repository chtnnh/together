"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import Link from "next/link";
import { useAuthConfig } from "@/components/auth-config-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { ThemeSelector } from "@/components/theme-selector";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

export default function SettingsPage() {
  const { configured, url, anonKey } = useAuthConfig();
  const { signedIn } = useSupabaseUser();
  const { prefs, setPrefs } = useUserPreferences(signedIn);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      supabase.auth.getUser().then(({ data }: { data: { user: { id: string; email?: string } | null } }) => {
        setUser(data.user);
        if (data.user?.email) setEmail(data.user.email);
      });
    } catch {
      // Handled by configured gate in UI.
    }
  }, [configured, url, anonKey]);

  const authRedirectTo = (next: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const handleGoogleSignIn = async () => {
    if (!configured) return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      const next = new URLSearchParams(window.location.search).get("next") ?? "/settings";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectTo(next) },
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
      const next = new URLSearchParams(window.location.search).get("next") ?? "/settings";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authRedirectTo(next),
        },
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
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Home</Button>
        </Link>
      </div>

      {user ? (
        <div className="space-y-3 rounded-xl border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="text-[var(--text)]">{user.email}</span>
          </p>
          <div>
            <Label className="mb-2 block text-sm font-medium">Theme</Label>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Applies across the app</p>
            <ThemeSelector className="w-full" value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Your account lets you save playlists and persist room settings.
          </p>
          <Link href="/playlists" className="block">
            <Button variant="secondary" className="w-full">View playlists</Button>
          </Link>
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      ) : !configured ? (
        <div className="rounded-xl border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)]">
            Sign-in isn&apos;t available on this server. You can still listen in rooms without an account.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-[var(--border)] p-6">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send magic link"}
            </Button>
          </form>
        </div>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">{message}</p>
      )}
    </div>
  );
}
