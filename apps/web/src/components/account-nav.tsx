"use client";

import Link from "next/link";
import { ListMusic, LogIn, User } from "lucide-react";
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
      <nav className={`flex items-center ${compact ? "gap-0.5" : "gap-2"}`}>
        {onAccountClick ? (
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            aria-label="Account"
            onClick={onAccountClick}
          >
            {compact ? <User className="h-4 w-4" /> : "Account"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          aria-label="Sign in"
          onClick={onSignIn}
        >
          {compact ? <LogIn className="h-4 w-4" /> : "Sign in"}
        </Button>
      </nav>
    );
  }

  return (
    <nav className={`flex items-center ${compact ? "gap-0.5" : "gap-2"}`}>
      {!hidePlaylists &&
        (onPlaylistsClick ? (
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            aria-label="Playlists"
            onClick={onPlaylistsClick}
          >
            {compact ? <ListMusic className="h-4 w-4" /> : "Playlists"}
          </Button>
        ) : (
          <Link href="/playlists">
            <Button
              variant="ghost"
              size={compact ? "icon" : "default"}
              aria-label="Playlists"
            >
              {compact ? <ListMusic className="h-4 w-4" /> : "Playlists"}
            </Button>
          </Link>
        ))}
      {onAccountClick ? (
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          aria-label="Account"
          onClick={onAccountClick}
        >
          {compact ? <User className="h-4 w-4" /> : "Account"}
        </Button>
      ) : (
        <Link href="/settings">
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            aria-label="Account"
          >
            {compact ? <User className="h-4 w-4" /> : "Account"}
          </Button>
        </Link>
      )}
    </nav>
  );
}
