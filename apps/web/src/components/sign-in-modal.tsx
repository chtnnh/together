"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import { X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  onSignedIn?: () => void;
}

export function SignInModal({ open, onClose, returnTo, onSignedIn }: SignInModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setMessage("Sign-in is not configured on this server.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const next = returnTo ?? window.location.pathname + window.location.search;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Check your email for a sign-in link. You can close this dialog.");
        onSignedIn?.();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send sign-in link");
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

        {!isSupabaseConfigured() ? (
          <p className="text-sm text-[var(--text-muted)]">
            Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY to enable accounts.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Optional account to save playlists, claim rooms, and sync preferences across devices.
            </p>
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
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">{message}</p>
        )}
      </div>
    </div>
  );
}
