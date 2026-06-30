"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Volume2, VolumeX } from "lucide-react";

interface PlaybackVolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMutedChange: (muted: boolean) => void;
  disabled?: boolean;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function PlaybackVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  disabled,
}: PlaybackVolumeControlProps) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const dragValueRef = useRef(0);
  const preMuteVolumeRef = useRef(volume > 0 ? volume : 100);

  const displayVolume = muted ? 0 : dragging ? dragValue : volume;
  const pct = displayVolume;

  const commitVolume = useCallback(
    (value: number) => {
      const next = clampVolume(value);
      if (next === 0) {
        onMutedChange(true);
        onVolumeChange(preMuteVolumeRef.current || 100);
        return;
      }
      preMuteVolumeRef.current = next;
      onMutedChange(false);
      onVolumeChange(next);
    },
    [onMutedChange, onVolumeChange],
  );

  const toggleMute = () => {
    if (disabled) return;
    if (muted) {
      const restore = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 100;
      onMutedChange(false);
      onVolumeChange(restore);
      return;
    }
    if (volume > 0) {
      preMuteVolumeRef.current = volume;
    }
    onMutedChange(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const next = ratio * 100;
    dragValueRef.current = next;
    setDragValue(next);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!dragging || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const next = ratio * 100;
    dragValueRef.current = next;
    setDragValue(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    commitVolume(dragValueRef.current);
  };

  return (
    <div className="flex items-center justify-center gap-2 px-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={toggleMute}
            disabled={disabled}
            aria-label={muted || displayVolume === 0 ? "Unmute" : "Mute"}
          >
            {muted || displayVolume === 0 ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{muted || displayVolume === 0 ? "Unmute" : "Mute"}</TooltipContent>
      </Tooltip>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayVolume}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="h-1.5 w-full max-w-40 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
        }}
        aria-label="Volume"
        aria-valuetext={`${Math.round(displayVolume)} percent`}
      />
    </div>
  );
}
