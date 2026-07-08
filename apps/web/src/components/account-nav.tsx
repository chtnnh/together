"use client";

import Link from "next/link";
import { Button } from "@together/ui";

interface AccountNavProps {
  signedIn: boolean;
  authLoading?: boolean;
  onSignIn?: () => void;
  onPlaylistsClick?: () => void;
  onAccountClick?: () => void;
  compact?: boolean;
  hidePlaylists?: boolean;
}

export function AccountNav({
  signedIn,
  authLoading,
  onSignIn,
  onPlaylistsClick,
  onAccountClick,
  compact = false,
  hidePlaylists = false,
}: AccountNavProps) {
  if (authLoading) {
    return <span className="text-sm text-[var(--text-muted)]">…</span>;
  }

  if (!signedIn) {
    return (
      <nav className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
        {onAccountClick ? (
          <Button variant="ghost" size={compact ? "sm" : "default"} onClick={onAccountClick}>
            Account
          </Button>
        ) : null}
        <Button variant="ghost" size={compact ? "sm" : "default"} onClick={onSignIn}>
          Sign in
        </Button>
      </nav>
    );
  }

  return (
    <nav className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
      {!hidePlaylists &&
        (onPlaylistsClick ? (
          <Button variant="ghost" size={compact ? "sm" : "default"} onClick={onPlaylistsClick}>
            Playlists
          </Button>
        ) : (
          <Link href="/playlists">
            <Button variant="ghost" size={compact ? "sm" : "default"}>
              Playlists
            </Button>
          </Link>
        ))}
      {onAccountClick ? (
        <Button variant="ghost" size={compact ? "sm" : "default"} onClick={onAccountClick}>
          Account
        </Button>
      ) : (
        <Link href="/settings">
          <Button variant="ghost" size={compact ? "sm" : "default"}>
            Account
          </Button>
        </Link>
      )}
    </nav>
  );
}
