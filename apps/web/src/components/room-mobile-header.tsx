"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@together/ui";
import {
  MessageSquareQuote,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { ConnectionStatus } from "@/components/connection-status";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";

interface RoomMobileHeaderProps {
  roomTitle: string;
  slug: string;
  offline: boolean;
  connected: boolean;
  synced: boolean;
  participantCount: number;
  onSyncPlayback: () => void;
  onParticipantsToggle: () => void;
  participantsOpen: boolean;
  participantsPanel: ReactNode;
  onShare: () => void;
  shareLabel: string;
  onDiscordStatus: () => void;
  discordLabel: string;
  onSettings: () => void;
  menuExtras: (close: () => void) => ReactNode;
}

export function RoomMobileHeader({
  roomTitle,
  slug,
  offline,
  connected,
  synced,
  participantCount,
  onSyncPlayback,
  onParticipantsToggle,
  participantsOpen,
  participantsPanel,
  onShare,
  shareLabel,
  onDiscordStatus,
  discordLabel,
  onSettings,
  menuExtras,
}: RoomMobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5 md:hidden">
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-base font-semibold leading-snug line-clamp-2 break-words">
          {roomTitle}
        </h1>
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Sync playback"
                onClick={onSyncPlayback}
              >
                <RefreshCw className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sync playback</TooltipContent>
          </Tooltip>
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <ConnectionStatus
          offline={offline}
          connected={connected}
          synced={synced}
          participantCount={participantCount}
          slug={slug}
          showSlug={false}
        />
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2"
            onClick={onParticipantsToggle}
            aria-label="View participants"
            aria-expanded={participantsOpen}
          >
            <Users className="size-4 shrink-0" />
            <span className="text-sm tabular-nums">{participantCount}</span>
          </Button>
          {participantsOpen && participantsPanel}
        </div>
      </div>
    </div>
  );
}
