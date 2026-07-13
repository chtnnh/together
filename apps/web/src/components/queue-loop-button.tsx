"use client";

import type { RoomSettings } from "@together/shared";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { ListOrdered, Repeat, Repeat1 } from "lucide-react";

type LoopMode = RoomSettings["loopMode"];

const LOOP_CYCLE: LoopMode[] = ["off", "queue", "track"];

const LOOP_CONFIG: Record<
  LoopMode,
  { icon: typeof Repeat; label: string; tooltip: string }
> = {
  off: {
    icon: ListOrdered,
    label: "Go through queue",
    tooltip: "Go through queue — play each track once",
  },
  queue: {
    icon: Repeat,
    label: "Loop queue",
    tooltip: "Loop queue — restart from the top when the queue ends",
  },
  track: {
    icon: Repeat1,
    label: "Loop video",
    tooltip: "Loop video — repeat the current track",
  },
};

function nextLoopMode(mode: LoopMode): LoopMode {
  const index = LOOP_CYCLE.indexOf(mode);
  return LOOP_CYCLE[(index + 1) % LOOP_CYCLE.length] ?? "off";
}

interface QueueLoopButtonProps {
  loopMode: LoopMode;
  disabled?: boolean;
  onChange: (loopMode: LoopMode) => void;
}

export function QueueLoopButton({ loopMode, disabled, onChange }: QueueLoopButtonProps) {
  const config = LOOP_CONFIG[loopMode];
  const Icon = config.icon;
  const active = loopMode !== "off";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-9 shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
          aria-label={config.label}
          disabled={disabled}
          onClick={() => onChange(nextLoopMode(loopMode))}
        >
          <Icon className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{config.tooltip}</TooltipContent>
    </Tooltip>
  );
}
