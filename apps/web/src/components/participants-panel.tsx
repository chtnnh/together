"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import type { Participant } from "@together/shared";
import { UserX, Shield } from "lucide-react";

interface ParticipantsPanelProps {
  participants: Participant[];
  currentId?: string;
  isHost: boolean;
  onKick: (id: string) => void;
  onBan: (id: string) => void;
  onPromote: (id: string) => void;
}

export function ParticipantsPanel({
  participants,
  currentId,
  isHost,
  onKick,
  onBan,
  onPromote,
}: ParticipantsPanelProps) {
  return (
    <div className="space-y-1 p-3">
      {participants.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-secondary)]"
        >
          <div>
            <span className="text-sm font-medium">
              {p.displayName}
              {p.id === currentId && " (you)"}
            </span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">{p.role}</span>
          </div>
          {isHost && p.id !== currentId && p.role !== "host" && (
            <div className="flex gap-1">
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
                  <Button
                    variant="ghost"
                    size="icon"
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
