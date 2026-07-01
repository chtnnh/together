"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEffectivePlaybackPosition } from "@together/shared";
import type { PlaybackState } from "@together/shared";

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlaybackSeekBarProps {
  playback: PlaybackState;
  durationMs: number;
  clockOffsetMs?: number;
  onSeek: (positionMs: number) => void;
  disabled?: boolean;
}

export function PlaybackSeekBar({
  playback,
  durationMs,
  clockOffsetMs = 0,
  onSeek,
  disabled,
}: PlaybackSeekBarProps) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [tick, setTick] = useState(0);
  const dragValueRef = useRef(0);

  const livePositionMs = playback.playing
    ? getEffectivePlaybackPosition(playback, Date.now(), clockOffsetMs)
    : playback.positionMs;

  useEffect(() => {
    if (!playback.playing || dragging) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [playback.playing, dragging]);

  void tick;

  const positionMs = dragging ? dragValue : livePositionMs;
  const maxMs = Math.max(durationMs, positionMs, 1);
  const pct = (positionMs / maxMs) * 100;

  const commitSeek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(ms, durationMs || ms));
      onSeek(clamped);
    },
    [durationMs, onSeek],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ms = ratio * maxMs;
    dragValueRef.current = ms;
    setDragValue(ms);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!dragging || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ms = ratio * maxMs;
    dragValueRef.current = ms;
    setDragValue(ms);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    commitSeek(dragValueRef.current);
  };

  if (!playback.videoId) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
        {formatTime(positionMs)}
      </span>
      <input
        type="range"
        min={0}
        max={maxMs}
        step={1000}
        value={positionMs}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
        }}
        aria-label="Seek"
      />
      <span className="w-10 shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
        {durationMs > 0 ? formatTime(durationMs) : "--:--"}
      </span>
    </div>
  );
}
