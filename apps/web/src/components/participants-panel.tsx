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
          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-secondary)]"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium">
              {p.displayName}
              {p.id === currentId && " (you)"}
            </span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">{p.role}</span>
          </div>
          {isHost && p.id !== currentId && p.role !== "host" && (
            <div className="flex shrink-0 gap-1">
              {isRoomOwner && p.userId && onTransferOwnership && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
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
                    <Button variant="ghost" size="icon" onClick={() => onPromote(p.id)}>
                      <Shield className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Promote to co-host</TooltipContent>
                </Tooltip>
              )}
              {p.role === "co-host" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onDemote(p.id)}>
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Demote to guest</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onKick(p.id)}>
                    <UserX className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kick from room</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onBan(p.id)}>
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
