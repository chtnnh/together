"use client";

import type { PlaybackState, ReactionEmoji, RoomReaction } from "@together/shared";
import { SkipVoteBar, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Pause, Play, SkipForward } from "lucide-react";
import { PlaybackSeekBar } from "@/components/playback-seek-bar";
import { PlaybackVolumeControl } from "@/components/playback-volume-control";
import { NowPlayingReactions } from "@/components/now-playing-reactions";

interface NowPlayingBarProps {
  playback: PlaybackState | null;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  durationMs: number;
  ready: boolean;
  canControlPlayback: boolean;
  skipVotes?: {
    voteCount: number;
    required: number;
    hasVoted: boolean;
    onVote: () => void;
  } | null;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMutedChange: (muted: boolean) => void;
  onSeek: (positionMs: number) => void;
  onPlayPause: () => void;
  onSkip: () => void;
  canSkip: boolean;
  onReactionSend?: (emoji: ReactionEmoji) => void;
  incomingReactions?: RoomReaction[];
  reducedMotion?: boolean;
}

export function NowPlayingBar({
  playback,
  title,
  artist,
  thumbnailUrl,
  durationMs,
  ready,
  canControlPlayback,
  skipVotes,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  onSeek,
  onPlayPause,
  onSkip,
  canSkip,
  onReactionSend,
  incomingReactions = [],
  reducedMotion = false,
}: NowPlayingBarProps) {
  const displayTitle = title ?? playback?.title ?? "Nothing playing";
  const showTransport = canControlPlayback && playback?.videoId;

  return (
    <div
      className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
      data-testid="now-playing-bar"
    >
      <div className="flex items-center gap-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-[var(--border)] text-xs text-[var(--text-muted)]">
            No art
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" aria-live="polite" aria-atomic="true">
            {displayTitle}
          </p>
          {artist && (
            <p className="truncate text-sm text-[var(--text-muted)]">{artist}</p>
          )}
        </div>
        <PlaybackVolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onMutedChange={onMutedChange}
          disabled={!ready}
          align="right"
          compact
        />
      </div>

      {playback?.videoId && (
        <div className="flex items-center gap-2">
          {showTransport && (
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onPlayPause}
                    disabled={!ready}
                    aria-label={playback.playing ? "Pause" : "Play"}
                    className="inline-flex size-10 items-center justify-center rounded-md text-[var(--text)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
                  >
                    {playback.playing ? (
                      <Pause className="size-5" strokeWidth={2.5} />
                    ) : (
                      <Play className="size-5" strokeWidth={2.5} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{playback.playing ? "Pause" : "Play"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Skip to next"
                    onClick={onSkip}
                    disabled={!canSkip}
                    className="inline-flex size-10 items-center justify-center rounded-md text-[var(--text)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
                  >
                    <SkipForward className="size-5" strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Skip to next</TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <PlaybackSeekBar
              playback={playback}
              durationMs={durationMs}
              disabled={!canControlPlayback || !ready}
              onSeek={onSeek}
            />
          </div>
        </div>
      )}

      {(skipVotes || onReactionSend) && (
        <div className="flex items-end justify-between gap-3 pt-1">
          {skipVotes ? (
            <div className="w-1/2 min-w-0">
              <SkipVoteBar
                voteCount={skipVotes.voteCount}
                required={skipVotes.required}
                hasVoted={skipVotes.hasVoted}
                onVote={skipVotes.onVote}
                compact
              />
            </div>
          ) : (
            <div className="w-1/2" />
          )}
          {onReactionSend ? (
            <NowPlayingReactions
              onSend={onReactionSend}
              incoming={incomingReactions}
              inline
              reducedMotion={reducedMotion}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
