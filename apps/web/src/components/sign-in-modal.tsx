"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import { X } from "lucide-react";
import { useAuthConfig } from "@/components/auth-config-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  onSignedIn?: () => void;
}

export function SignInModal({ open, onClose, returnTo, onSignedIn }: SignInModalProps) {
  const { configured, url, anonKey } = useAuthConfig();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dialogRef = useFocusTrap(open, onClose);

  useEffect(() => {
    if (!open) {
      setMessage(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const authRedirectTo = () => {
    const origin = window.location.origin;
    const next = returnTo ?? window.location.pathname + window.location.search;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  };

  const handleGoogleSignIn = async () => {
    if (!configured) return;
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectTo() },
      });
      if (error) setMessage(error.message);
    } catch {
      setMessage("Could not start Google sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setMessage("Sign-in isn't available on this server. You can still listen in rooms without an account.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: authRedirectTo() },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Check your email for a sign-in link. You can close this dialog.");
        onSignedIn?.();
      }
    } catch {
      setMessage("Could not send sign-in link. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!configured ? (
          <p className="text-sm text-[var(--text-muted)]">
            Sign-in isn&apos;t available on this server. You can still listen in rooms without an account.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Optional account to save playlists, claim rooms, and sync preferences across devices.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="sign-in-email">Email</Label>
                <Input
                  id="sign-in-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? "Sending..." : "Send magic link"}
              </Button>
            </form>
          </div>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">{message}</p>
        )}
      </div>
    </div>
  );
}
