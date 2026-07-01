"use client";

import Link from "next/link";
import { Button } from "@together/ui";

interface AccountNavProps {
  signedIn: boolean;
  authLoading?: boolean;
  onSignIn?: () => void;
  compact?: boolean;
}

export function AccountNav({ signedIn, authLoading, onSignIn, compact = false }: AccountNavProps) {
  if (authLoading) {
    return <span className="text-sm text-[var(--text-muted)]">…</span>;
  }

  if (!signedIn) {
    return (
      <Button variant="ghost" size={compact ? "sm" : "default"} onClick={onSignIn}>
        Sign in
      </Button>
    );
  }

  return (
    <nav className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
      <Link href="/playlists">
        <Button variant="ghost" size={compact ? "sm" : "default"}>
          Playlists
        </Button>
      </Link>
      <Link href="/settings">
        <Button variant="ghost" size={compact ? "sm" : "default"}>
          Account
        </Button>
      </Link>
    </nav>
  );
}
