"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import type { Participant } from "@together/shared";
import { Crown, Shield, ShieldOff, UserX } from "lucide-react";

interface ParticipantsPanelProps {
  participants: Participant[];
  currentId?: string;
  /** Host or co-host — can moderate */
  isHost: boolean;
  /** Room host — can transfer ownership to signed-in participants */
  isRoomOwner?: boolean;
  onKick: (id: string) => void;
  onBan: (id: string) => void;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onTransferOwnership?: (id: string, userId: string) => void;
}

export function ParticipantsPanel({
  participants,
  currentId,
  isHost,
  isRoomOwner = false,
  onKick,
  onBan,
  onPromote,
  onDemote,
  onTransferOwnership,
}: ParticipantsPanelProps) {
  const transferTargets = participants.filter(
    (p) => p.id !== currentId && p.role !== "host" && p.userId,
  );

  return (
    <div className="space-y-1 p-3">
      {isRoomOwner && (
        <p className="mb-2 px-1 text-xs text-[var(--text-muted)]">
          {transferTargets.length > 0
            ? "Crown transfers room ownership (signed-in members only)."
            : "Transfer ownership requires a signed-in co-host or guest."}
        </p>
      )}
      {participants.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-[var(--bg-secondary)]"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {p.displayName}
              {p.id === currentId && " (you)"}
            </p>
            <p className="text-xs capitalize text-[var(--text-muted)]">{p.role.replace("-", " ")}</p>
          </div>
          {isHost && p.id !== currentId && p.role !== "host" && (
            <div className="flex shrink-0 items-center gap-0.5">
              {isRoomOwner && p.userId && onTransferOwnership && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Transfer ownership to ${p.displayName}`}
                      onClick={() => onTransferOwnership(p.id, p.userId!)}
                    >
                      <Crown className="h-4 w-4 text-amber-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Transfer ownership</TooltipContent>
                </Tooltip>
              )}
              {p.role === "guest" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onPromote(p.id)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Promote to co-host</TooltipContent>
                </Tooltip>
              )}
              {p.role === "co-host" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDemote(p.id)}
                    >
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Demote to guest</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onKick(p.id)}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kick from room</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onBan(p.id)}
                  >
                    <UserX className="h-4 w-4 text-red-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ban from room</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
