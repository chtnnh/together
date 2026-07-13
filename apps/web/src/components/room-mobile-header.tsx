"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@together/ui";
import {
  MessageSquareQuote,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Share2,
} from "lucide-react";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";

interface RoomMobileMoreMenuProps {
  onShare: () => void;
  shareLabel: string;
  onDiscordStatus: () => void;
  discordLabel: string;
  onSettings: () => void;
  menuExtras: (close: () => void) => ReactNode;
}

export function RoomMobileMoreMenu({
  onShare,
  shareLabel,
  onDiscordStatus,
  discordLabel,
  onSettings,
  menuExtras,
}: RoomMobileMoreMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        aria-label="More actions"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal className="size-5" />
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--bg)] py-1 shadow-xl">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-secondary)]"
            onClick={() => {
              closeMenu();
              onShare();
            }}
          >
            <Share2 className="size-4 shrink-0" />
            {shareLabel}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-secondary)]"
            onClick={() => {
              closeMenu();
              onDiscordStatus();
            }}
          >
            <MessageSquareQuote className="size-4 shrink-0" />
            {discordLabel}
          </button>
          {menuExtras(closeMenu)}
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-secondary)]"
            onClick={() => {
              closeMenu();
              onSettings();
            }}
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </button>
        </div>
      )}
    </div>
  );
}
